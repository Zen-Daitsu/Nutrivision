"""ONNX Runtime session + letterbox preprocessing + Mojo/NumPy postprocess dispatch."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import cv2
import numpy as np
import onnxruntime as ort

from . import mojo_bridge, postprocess
from .config import Settings

log = logging.getLogger("nutrivision.inference")


@dataclass
class Detection:
    class_id: int
    score: float
    box_xyxy: tuple[float, float, float, float]
    mask_area_px: int
    mask_width_px: float


@dataclass
class InferenceResult:
    detections: list[Detection]
    inference_ms: float
    postprocess_ms: float
    source: str


def letterbox(img: np.ndarray, size: int) -> tuple[np.ndarray, float, tuple[float, float]]:
    h, w = img.shape[:2]
    r = min(size / h, size / w)
    nh, nw = int(round(h * r)), int(round(w * r))
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    dw, dh = (size - nw) / 2, (size - nh) / 2
    top, left = int(round(dh - 0.1)), int(round(dw - 0.1))
    canvas[top:top + nh, left:left + nw] = resized
    return canvas, r, (dw, dh)


class Engine:
    def __init__(self, cfg: Settings, class_names: list[str]):
        self.cfg = cfg
        self.class_names = class_names
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = cfg.ort_intra_threads
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        providers = [p for p in ("CUDAExecutionProvider", "CPUExecutionProvider")
                     if p in ort.get_available_providers()]
        self.session = ort.InferenceSession(cfg.model_path, sess_options=opts, providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        self.mojo_ok = cfg.mojo_enabled and mojo_bridge.load(cfg.mojo_lib_path)
        log.info("ORT providers=%s mojo=%s", self.session.get_providers(), self.mojo_ok)

    def preprocess(self, bgr: np.ndarray) -> tuple[np.ndarray, float, tuple[float, float]]:
        padded, ratio, pad = letterbox(bgr, self.cfg.input_size)
        rgb = cv2.cvtColor(padded, cv2.COLOR_BGR2RGB)
        tensor = rgb.astype(np.float32) / 255.0
        tensor = np.transpose(tensor, (2, 0, 1))[None]
        return np.ascontiguousarray(tensor), ratio, pad

    def run(self, bgr: np.ndarray) -> InferenceResult:
        orig_shape = bgr.shape[:2]
        tensor, ratio, pad = self.preprocess(bgr)

        t0 = time.perf_counter()
        outputs = self.session.run(None, {self.input_name: tensor})
        t1 = time.perf_counter()

        output0, output1 = outputs[0], outputs[1]
        source = "numpy"

        if self.mojo_ok:
            try:
                boxes, scores, class_ids, idx = mojo_bridge.decode_nms(
                    output0, self.cfg.conf_threshold, self.cfg.iou_threshold, self.cfg.max_detections
                )
                nc = output0.shape[1] - 4 - postprocess.NUM_MASK_COEF
                coefs = np.squeeze(output0, 0).T[idx, 4 + nc:]
                protos = np.squeeze(output1, 0)
                c, mh, mw = protos.shape
                masks = 1.0 / (1.0 + np.exp(-(coefs @ protos.reshape(c, -1))))
                masks = masks.reshape(-1, mh, mw).astype(np.float32)
                source = "mojo"
            except RuntimeError as exc:
                log.warning("Mojo kernel error, falling back: %s", exc)
                boxes, scores, class_ids, masks = postprocess.decode(
                    output0, output1, self.cfg.conf_threshold,
                    self.cfg.iou_threshold, self.cfg.max_detections)
        else:
            boxes, scores, class_ids, masks = postprocess.decode(
                output0, output1, self.cfg.conf_threshold,
                self.cfg.iou_threshold, self.cfg.max_detections)

        full_masks = postprocess.crop_and_scale_masks(
            masks, boxes, self.cfg.input_size, ratio, pad, orig_shape)
        boxes_orig = postprocess.scale_boxes(boxes, ratio, pad, orig_shape)
        t2 = time.perf_counter()

        dets: list[Detection] = []
        for i, m in enumerate(full_masks):
            area = int(m.sum())
            if area < 64:                      # discard specks
                continue
            cols = np.flatnonzero(m.any(axis=0))
            width = float(cols[-1] - cols[0]) if cols.size else 0.0
            dets.append(Detection(
                class_id=int(class_ids[i]),
                score=float(scores[i]),
                box_xyxy=tuple(float(v) for v in boxes_orig[i]),
                mask_area_px=area,
                mask_width_px=width,
            ))

        return InferenceResult(
            detections=dets,
            inference_ms=round((t1 - t0) * 1000, 2),
            postprocess_ms=round((t2 - t1) * 1000, 2),
            source=source,
        )

    def name_of(self, class_id: int) -> str:
        return self.class_names[class_id] if 0 <= class_id < len(self.class_names) else f"class_{class_id}"
