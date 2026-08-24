"""Export trained weights to ONNX and verify the graph before it can ship.

The first-pass script exported the stock COCO checkpoint and printed success
without checking anything. An export that loads is not an export that is correct:
this one runs both graphs on the same tensor and compares outputs.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", type=Path, required=True, help="runs/nutrivision/weights/best.pt")
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--opset", type=int, default=17)
    ap.add_argument("--out", type=Path, default=Path("backend/models/yolov8s-seg.onnx"))
    ap.add_argument("--tolerance", type=float, default=1e-3)
    args = ap.parse_args()

    from ultralytics import YOLO

    model = YOLO(str(args.weights))
    names = [model.names[i] for i in sorted(model.names)]

    onnx_path = Path(model.export(
        format="onnx",
        imgsz=args.imgsz,
        opset=args.opset,
        dynamic=False,      # static shapes: ORT picks better kernels and the PWA always sends 640
        simplify=True,
        half=False,
    ))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    onnx_path.replace(args.out)
    args.out.with_suffix(".classes.json").write_text(json.dumps(names, indent=1))

    # --- parity check ---
    import onnxruntime as ort
    import torch

    rng = np.random.default_rng(0)
    sample = rng.random((1, 3, args.imgsz, args.imgsz), dtype=np.float32)

    sess = ort.InferenceSession(str(args.out), providers=["CPUExecutionProvider"])
    onnx_out = sess.run(None, {sess.get_inputs()[0].name: sample})

    torch_out = model.model(torch.from_numpy(sample))
    torch_pred = torch_out[0].detach().numpy()

    diff = float(np.abs(torch_pred - onnx_out[0]).max())
    print(json.dumps({
        "classes": names,
        "onnx": str(args.out),
        "output_shapes": [list(o.shape) for o in onnx_out],
        "max_abs_diff_vs_torch": diff,
    }, indent=2))
    if diff > args.tolerance:
        raise SystemExit(f"ONNX parity check failed: max abs diff {diff} > {args.tolerance}")


if __name__ == "__main__":
    main()
