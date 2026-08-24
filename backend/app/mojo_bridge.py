"""ctypes bridge to the Mojo postprocessing kernel.

Contract with mojo/postprocess.mojo:

    nv_decode_nms(
        preds:  *f32   flattened (4+nc+32, N) row-major, exactly as ONNX Runtime returns it
        n_preds: i32
        n_attrs: i32   4 + nc + 32
        n_cls:   i32
        conf:    f32
        iou:     f32
        max_det: i32
        out_boxes: *f32  max_det * 4   (xyxy, letterbox pixels)
        out_scores:*f32  max_det
        out_cls:   *i32  max_det
        out_idx:   *i32  max_det       index into the original prediction axis
    ) -> i32  number kept, or negative on error

Mask coefficient math stays in NumPy: it is a single GEMM that BLAS already
threads well, so moving it to Mojo buys nothing measurable.

The library is optional. If it is missing or the ABI does not match, the caller
falls back to app.postprocess and the response reports source="numpy".
"""
from __future__ import annotations

import ctypes
import logging
import os
from typing import Any

import numpy as np

log = logging.getLogger("nutrivision.mojo")

_lib: Any = None
_loaded = False


def load(path: str) -> bool:
    global _lib, _loaded
    if _loaded:
        return _lib is not None
    _loaded = True
    if not os.path.exists(path):
        log.warning("Mojo kernel not built at %s — using NumPy postprocessing", path)
        return False
    try:
        lib = ctypes.CDLL(path)
        lib.nv_decode_nms.restype = ctypes.c_int32
        lib.nv_decode_nms.argtypes = [
            ctypes.POINTER(ctypes.c_float),  # preds
            ctypes.c_int32,                  # n_preds
            ctypes.c_int32,                  # n_attrs
            ctypes.c_int32,                  # n_cls
            ctypes.c_float,                  # conf
            ctypes.c_float,                  # iou
            ctypes.c_int32,                  # max_det
            ctypes.POINTER(ctypes.c_float),  # out_boxes
            ctypes.POINTER(ctypes.c_float),  # out_scores
            ctypes.POINTER(ctypes.c_int32),  # out_cls
            ctypes.POINTER(ctypes.c_int32),  # out_idx
        ]
        _lib = lib
        log.info("Mojo kernel loaded from %s", path)
        return True
    except OSError as exc:                       # ABI mismatch, missing MAX runtime, wrong arch
        log.warning("Mojo kernel unusable (%s) — using NumPy postprocessing", exc)
        return False


def available() -> bool:
    return _lib is not None


def decode_nms(
    output0: np.ndarray,
    conf: float,
    iou: float,
    max_det: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Returns (boxes_xyxy, scores, class_ids, pred_indices)."""
    if _lib is None:
        raise RuntimeError("Mojo kernel not loaded")

    arr = np.ascontiguousarray(np.squeeze(output0, 0), dtype=np.float32)  # (n_attrs, n_preds)
    n_attrs, n_preds = arr.shape
    n_cls = n_attrs - 4 - 32

    out_boxes = np.zeros((max_det, 4), dtype=np.float32)
    out_scores = np.zeros(max_det, dtype=np.float32)
    out_cls = np.zeros(max_det, dtype=np.int32)
    out_idx = np.zeros(max_det, dtype=np.int32)

    kept = _lib.nv_decode_nms(
        arr.ctypes.data_as(ctypes.POINTER(ctypes.c_float)),
        ctypes.c_int32(n_preds),
        ctypes.c_int32(n_attrs),
        ctypes.c_int32(n_cls),
        ctypes.c_float(conf),
        ctypes.c_float(iou),
        ctypes.c_int32(max_det),
        out_boxes.ctypes.data_as(ctypes.POINTER(ctypes.c_float)),
        out_scores.ctypes.data_as(ctypes.POINTER(ctypes.c_float)),
        out_cls.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
        out_idx.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
    )
    if kept < 0:
        raise RuntimeError(f"nv_decode_nms failed with code {kept}")
    return out_boxes[:kept], out_scores[:kept], out_cls[:kept], out_idx[:kept]
