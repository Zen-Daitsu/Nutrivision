"""Fine-tune YOLOv8-seg. Run on a T4 (Colab) or a g4dn.xlarge; CPU training is not viable."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=Path("my_dataset/data.yaml"))
    ap.add_argument("--weights", default="yolov8s-seg.pt")
    ap.add_argument("--epochs", type=int, default=120)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--project", default="runs")
    ap.add_argument("--name", default="nutrivision")
    args = ap.parse_args()

    model = YOLO(args.weights)
    model.train(
        data=str(args.data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=args.project,
        name=args.name,
        seed=0,
        deterministic=True,
        patience=25,
        cos_lr=True,
        # Food is photographed under wildly varying light; geometry augmentation
        # matters less than colour. Vertical flip is on: plates get photographed
        # from any side.
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.5,
        degrees=15.0, translate=0.1, scale=0.5, fliplr=0.5, flipud=0.5,
        mosaic=1.0, close_mosaic=15,
    )
    metrics = model.val(data=str(args.data), split="test")
    Path("runs/metrics.json").write_text(json.dumps({
        "map50_mask": float(metrics.seg.map50),
        "map50_95_mask": float(metrics.seg.map),
        "map50_box": float(metrics.box.map50),
    }, indent=2))


if __name__ == "__main__":
    main()
