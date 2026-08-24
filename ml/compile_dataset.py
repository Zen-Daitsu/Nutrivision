"""FoodSeg103 semantic masks -> YOLO segmentation labels.

Fixes over the first-pass script, each of which silently corrupted the dataset:

  1. class id was hardcoded to 0, collapsing every ingredient into one class.
     Now mapped through class_map.yaml; unmapped source ids are dropped.
  2. split routing used hash(), which is salted per process (PYTHONHASHSEED).
     Reruns reshuffled the split, so val leaked into train across DVC versions.
     Now sha1 of the basename: stable across processes, machines and Python builds.
  3. contours were written point-by-point at full resolution, producing label files
     larger than the images. Now Douglas-Peucker simplified with a minimum vertex
     count and a minimum area filter.
  4. RETR_EXTERNAL on a multi-instance mask merged touching instances. Uses
     connected components per class so each blob becomes its own polygon.
  5. data.yaml was written with a Windows absolute path and nc that disagreed with
     names. Now emitted relative with names as the single source of truth.

Usage:
    python ml/compile_dataset.py --src data/FoodSeg103 --dst my_dataset
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter
from pathlib import Path

import cv2
import numpy as np
import yaml

SPLIT_RATIO = {"train": 0.70, "val": 0.20, "test": 0.10}
MIN_POLY_AREA_PX = 200          # blobs smaller than this are annotation noise
MIN_VERTICES = 6
SIMPLIFY_EPS_RATIO = 0.0015     # fraction of the contour perimeter


def route(basename: str) -> str:
    """Deterministic split. sha1 is stable across processes; hash() is not."""
    bucket = int(hashlib.sha1(basename.encode()).hexdigest()[:8], 16) % 100
    if bucket < SPLIT_RATIO["train"] * 100:
        return "train"
    if bucket < (SPLIT_RATIO["train"] + SPLIT_RATIO["val"]) * 100:
        return "val"
    return "test"


def mask_to_polygons(mask: np.ndarray, src_to_dst: dict[int, int]) -> list[str]:
    h, w = mask.shape
    lines: list[str] = []

    for src_id in np.unique(mask):
        src_id = int(src_id)
        if src_id == 0 or src_id not in src_to_dst:
            continue
        dst_id = src_to_dst[src_id]

        binary = (mask == src_id).astype(np.uint8)
        n_labels, labelled = cv2.connectedComponents(binary, connectivity=8)

        for blob in range(1, n_labels):
            component = (labelled == blob).astype(np.uint8)
            if int(component.sum()) < MIN_POLY_AREA_PX:
                continue
            contours, _ = cv2.findContours(component, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue
            contour = max(contours, key=cv2.contourArea)
            eps = SIMPLIFY_EPS_RATIO * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, eps, True)
            if len(approx) < MIN_VERTICES:
                approx = contour                    # keep detail rather than drop the instance
            if len(approx) < 3:
                continue

            coords: list[str] = []
            for pt in approx.reshape(-1, 2):
                coords.append(f"{np.clip(pt[0] / w, 0, 1):.6f}")
                coords.append(f"{np.clip(pt[1] / h, 0, 1):.6f}")
            lines.append(f"{dst_id} " + " ".join(coords))
    return lines


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, required=True, help="FoodSeg103 root")
    ap.add_argument("--dst", type=Path, required=True, help="compiled YOLO dataset root")
    ap.add_argument("--map", type=Path, default=Path(__file__).parent / "class_map.yaml")
    args = ap.parse_args()

    cfg = yaml.safe_load(args.map.read_text())
    names: dict[int, str] = cfg["target_classes"]
    src_to_dst: dict[int, int] = {int(k): int(v) for k, v in cfg["source_to_target"].items()}

    for split in SPLIT_RATIO:
        (args.dst / split / "images").mkdir(parents=True, exist_ok=True)
        (args.dst / split / "labels").mkdir(parents=True, exist_ok=True)

    stats: Counter = Counter()
    class_counts: Counter = Counter()

    for phase in ("train", "test"):
        img_dir = args.src / "Images" / "img_dir" / phase
        ann_dir = args.src / "Images" / "ann_dir" / phase
        if not img_dir.is_dir():
            stats["missing_phase"] += 1
            continue

        for img_path in sorted(img_dir.iterdir()):
            if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            mask_path = ann_dir / f"{img_path.stem}.png"
            if not mask_path.exists():
                stats["no_mask"] += 1
                continue

            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
            if mask is None:
                stats["unreadable_mask"] += 1
                continue

            polygons = mask_to_polygons(mask, src_to_dst)
            if not polygons:
                stats["no_target_class"] += 1        # image holds none of our 10 classes
                continue

            for line in polygons:
                class_counts[int(line.split(" ", 1)[0])] += 1

            split = route(img_path.stem)
            shutil.copy2(img_path, args.dst / split / "images" / img_path.name)
            (args.dst / split / "labels" / f"{img_path.stem}.txt").write_text("\n".join(polygons))
            stats[split] += 1

    data_yaml = {
        "path": ".",
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "names": {int(k): v for k, v in names.items()},
    }
    (args.dst / "data.yaml").write_text(yaml.safe_dump(data_yaml, sort_keys=False))
    (args.dst / "compile_report.json").write_text(json.dumps(
        {"images": dict(stats), "instances_per_class": {names[k]: v for k, v in sorted(class_counts.items())}},
        indent=2))

    print(json.dumps(dict(stats), indent=2))
    print(json.dumps({names[k]: v for k, v in sorted(class_counts.items())}, indent=2))


if __name__ == "__main__":
    main()
