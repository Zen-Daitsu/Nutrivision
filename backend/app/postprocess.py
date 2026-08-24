"""Reference NumPy postprocessing for YOLOv8-seg ONNX output.

Kept as the correctness oracle: tests/test_postprocess.py asserts the Mojo kernel
returns the same boxes within tolerance. It is also the fallback when the Mojo
shared library is absent (e.g. on a runner without the MAX toolchain).

ONNX graph outputs (ultralytics yolov8*-seg export):
    output0: (1, 4 + nc + 32, N)   xywh (letterbox px) + class scores + mask coefficients
    output1: (1, 32, mh, mw)       prototype masks
"""
from __future__ import annotations

import numpy as np

NUM_MASK_COEF = 32


def _xywh_to_xyxy(b: np.ndarray) -> np.ndarray:
    out = np.empty_like(b)
    out[:, 0] = b[:, 0] - b[:, 2] / 2
    out[:, 1] = b[:, 1] - b[:, 3] / 2
    out[:, 2] = b[:, 0] + b[:, 2] / 2
    out[:, 3] = b[:, 1] + b[:, 3] / 2
    return out


def nms(boxes: np.ndarray, scores: np.ndarray, iou_thres: float, max_det: int) -> list[int]:
    order = scores.argsort()[::-1]
    area = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    keep: list[int] = []
    while order.size and len(keep) < max_det:
        i = order[0]
        keep.append(int(i))
        if order.size == 1:
            break
        rest = order[1:]
        xx1 = np.maximum(boxes[i, 0], boxes[rest, 0])
        yy1 = np.maximum(boxes[i, 1], boxes[rest, 1])
        xx2 = np.minimum(boxes[i, 2], boxes[rest, 2])
        yy2 = np.minimum(boxes[i, 3], boxes[rest, 3])
        inter = np.clip(xx2 - xx1, 0, None) * np.clip(yy2 - yy1, 0, None)
        iou = inter / (area[i] + area[rest] - inter + 1e-9)
        order = rest[iou <= iou_thres]
    return keep


def decode(
    output0: np.ndarray,
    output1: np.ndarray,
    conf_thres: float,
    iou_thres: float,
    max_det: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Returns (boxes_xyxy_letterbox, scores, class_ids, masks_at_proto_res)."""
    pred = np.squeeze(output0, 0).T                      # (N, 4+nc+32)
    nc = pred.shape[1] - 4 - NUM_MASK_COEF

    cls_scores = pred[:, 4 : 4 + nc]
    scores = cls_scores.max(axis=1)
    keep_mask = scores > conf_thres
    if not keep_mask.any():
        return (np.zeros((0, 4), np.float32), np.zeros(0, np.float32),
                np.zeros(0, np.int32), np.zeros((0, 0, 0), np.float32))

    pred = pred[keep_mask]
    scores = scores[keep_mask]
    class_ids = cls_scores[keep_mask].argmax(axis=1).astype(np.int32)
    boxes = _xywh_to_xyxy(pred[:, :4])
    coefs = pred[:, 4 + nc :]

    # Class-aware NMS: offset each class into its own coordinate band.
    offset = class_ids[:, None].astype(np.float32) * 8192.0
    keep = nms(boxes + offset, scores, iou_thres, max_det)

    boxes, scores, class_ids, coefs = boxes[keep], scores[keep], class_ids[keep], coefs[keep]

    protos = np.squeeze(output1, 0)                      # (32, mh, mw)
    c, mh, mw = protos.shape
    masks = coefs @ protos.reshape(c, -1)                # (k, mh*mw)
    masks = 1.0 / (1.0 + np.exp(-masks))
    masks = masks.reshape(-1, mh, mw)
    return boxes.astype(np.float32), scores.astype(np.float32), class_ids, masks.astype(np.float32)


def crop_and_scale_masks(
    masks: np.ndarray,
    boxes_letterbox: np.ndarray,
    input_size: int,
    ratio: float,
    pad: tuple[float, float],
    orig_shape: tuple[int, int],
    mask_thres: float = 0.5,
) -> list[np.ndarray]:
    """Crop each mask to its box, undo letterbox, resize to the original frame."""
    import cv2

    if masks.size == 0:
        return []
    mh, mw = masks.shape[1:]
    gain_x, gain_y = mw / input_size, mh / input_size
    oh, ow = orig_shape
    out: list[np.ndarray] = []

    for m, b in zip(masks, boxes_letterbox):
        mm = m.copy()
        x1, y1, x2, y2 = b
        # zero everything outside the detection box (ultralytics crop_mask)
        gx1, gy1 = int(max(0, x1 * gain_x)), int(max(0, y1 * gain_y))
        gx2, gy2 = int(min(mw, x2 * gain_x + 1)), int(min(mh, y2 * gain_y + 1))
        cropped = np.zeros_like(mm)
        cropped[gy1:gy2, gx1:gx2] = mm[gy1:gy2, gx1:gx2]

        full = cv2.resize(cropped, (input_size, input_size), interpolation=cv2.INTER_LINEAR)
        px, py = pad
        x_lo, y_lo = int(round(px)), int(round(py))
        x_hi, y_hi = input_size - int(round(px)), input_size - int(round(py))
        unpadded = full[y_lo:y_hi, x_lo:x_hi]
        resized = cv2.resize(unpadded, (ow, oh), interpolation=cv2.INTER_LINEAR)
        out.append((resized > mask_thres).astype(np.uint8))
    return out


def scale_boxes(boxes: np.ndarray, ratio: float, pad: tuple[float, float],
                orig_shape: tuple[int, int]) -> np.ndarray:
    if boxes.size == 0:
        return boxes
    oh, ow = orig_shape
    b = boxes.copy()
    b[:, [0, 2]] = (b[:, [0, 2]] - pad[0]) / ratio
    b[:, [1, 3]] = (b[:, [1, 3]] - pad[1]) / ratio
    b[:, [0, 2]] = b[:, [0, 2]].clip(0, ow)
    b[:, [1, 3]] = b[:, [1, 3]].clip(0, oh)
    return b
