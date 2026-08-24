"""Runtime configuration. Every value is overridable by environment variable."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # --- HTTP ---
    allowed_origins: str = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8000"
    )
    max_upload_bytes: int = 8 * 1024 * 1024
    request_timeout_s: float = 15.0

    # --- Model ---
    model_path: str = str(ROOT / "models" / "yolov8s-seg.onnx")
    input_size: int = 640
    conf_threshold: float = 0.30
    iou_threshold: float = 0.50
    max_detections: int = 30
    ort_intra_threads: int = int(os.getenv("ORT_INTRA_THREADS", "4"))

    # --- Mojo acceleration ---
    mojo_lib_path: str = str(ROOT / "mojo" / "build" / "libnvpost.so")
    mojo_enabled: bool = os.getenv("MOJO_ENABLED", "1") == "1"

    # --- Nutrition ---
    usda_api_key: str = os.getenv("USDA_API_KEY", "")
    usda_base_url: str = "https://api.nal.usda.gov/fdc/v1"
    usda_cache_path: str = str(ROOT / "data" / "usda_cache.json")
    local_db_path: str = str(ROOT / "data" / "nutrition_db.json")

    # --- Mass estimation ---
    default_plate_diameter_mm: float = 260.0

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    class Config:
        env_prefix = "NV_"


@lru_cache
def settings() -> Settings:
    return Settings()
