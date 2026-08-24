"""FastAPI orchestrator: multipart in, macro table out."""
from __future__ import annotations

import asyncio
import io
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .config import Settings, settings
from .inference import Engine
from .mass import (Scale, estimate_mass_g, scale_from_fiducial, scale_from_frame,
                   scale_from_plate)
from .nutrition import NutritionResolver, scale_to_mass
from .schemas import AnalysisResponse, DetectedItem, Macros

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("nutrivision")

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
STATE: dict = {}


def load_class_names(cfg: Settings) -> list[str]:
    path = Path(cfg.model_path).with_suffix(".classes.json")
    if path.exists():
        return json.loads(path.read_text())
    return ["chicken_breast", "white_rice", "broccoli"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = settings()
    names = load_class_names(cfg)
    STATE["engine"] = Engine(cfg, names)
    STATE["nutrition"] = NutritionResolver(
        cfg.usda_api_key, cfg.usda_base_url, cfg.usda_cache_path, cfg.local_db_path)
    log.info("engine ready: %d classes", len(names))
    yield
    STATE.clear()


app = FastAPI(title="NutriVision", version="1.0.0", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().origins,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=3600,
)


@app.get("/healthz")
async def healthz():
    engine = STATE.get("engine")
    return {
        "status": "ok" if engine else "starting",
        "providers": engine.session.get_providers() if engine else [],
        "mojo": bool(engine and engine.mojo_ok),
    }


async def read_image(file: UploadFile, cfg: Settings) -> np.ndarray:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(415, f"Unsupported media type {file.content_type}")
    payload = await file.read(cfg.max_upload_bytes + 1)
    if len(payload) > cfg.max_upload_bytes:
        raise HTTPException(413, "Image exceeds the 8 MB limit")
    if not payload:
        raise HTTPException(400, "Empty upload")
    img = cv2.imdecode(np.frombuffer(payload, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Image could not be decoded")
    return img


def resolve_scale(dets, engine, frame_w: int, ref_mm: float | None, cfg: Settings) -> Scale:
    for d in dets:
        if engine.name_of(d.class_id) == "reference_card" and ref_mm:
            return scale_from_fiducial(d.mask_width_px, ref_mm)
    for d in dets:
        if engine.name_of(d.class_id) == "plate":
            return scale_from_plate(d.mask_width_px, cfg.default_plate_diameter_mm)
    return scale_from_frame(float(frame_w))


@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze(
    file: UploadFile = File(...),
    reference_width_mm: float | None = Form(default=None),
    cfg: Settings = Depends(settings),
):
    engine: Engine = STATE["engine"]
    resolver: NutritionResolver = STATE["nutrition"]

    img = await read_image(file, cfg)

    # ORT releases the GIL, but keep the event loop free for concurrent uploads.
    result = await asyncio.to_thread(engine.run, img)

    scale = resolve_scale(result.detections, engine, img.shape[1], reference_width_mm, cfg)

    items: list[DetectedItem] = []
    totals = {"protein": 0.0, "carbs": 0.0, "fat": 0.0, "calories": 0.0}

    edible = [d for d in result.detections
              if engine.name_of(d.class_id) not in {"plate", "reference_card"}]
    tables = await asyncio.gather(*(resolver.per_100g(engine.name_of(d.class_id)) for d in edible))

    for det, per100 in zip(edible, tables):
        name = engine.name_of(det.class_id)
        mass = estimate_mass_g(name, det.mask_area_px, scale)
        macros = scale_to_mass(per100, mass)
        for k in totals:
            totals[k] += macros[k]
        items.append(DetectedItem(
            class_id=det.class_id,
            name=name,
            confidence=round(det.score, 4),
            box_xyxy=list(det.box_xyxy),
            mask_area_px=det.mask_area_px,
            mass_g=round(mass, 1),
            mass_confidence=scale.confidence,
            macros=Macros(**macros),
            fdc_id=per100.get("fdc_id"),
        ))

    return AnalysisResponse(
        items=items,
        totals=Macros(**{k: round(v, 2) for k, v in totals.items()}),
        inference_ms=result.inference_ms,
        postprocess_ms=result.postprocess_ms,
        source=result.source,
        scale_px_per_mm=round(scale.px_per_mm, 3),
    )
