"""Data contract gate. Runs in CI before any training or deployment job.

Fails the build on: label/image orphans, out-of-range class ids, denormalised
coordinates, odd coordinate counts, empty label files, and class starvation.
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

import yaml

MIN_INSTANCES_PER_CLASS = 50


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", type=Path, required=True)
    args = ap.parse_args()

    cfg = yaml.safe_load((args.dataset / "data.yaml").read_text())
    n_classes = len(cfg["names"])
    errors: list[str] = []
    counts: Counter = Counter()

    for split in ("train", "val", "test"):
        images = {p.stem for p in (args.dataset / split / "images").glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png"}}
        labels = {p.stem for p in (args.dataset / split / "labels").glob("*.txt")}

        for orphan in sorted(images - labels)[:10]:
            errors.append(f"{split}: image without label: {orphan}")
        for orphan in sorted(labels - images)[:10]:
            errors.append(f"{split}: label without image: {orphan}")

        for label_path in (args.dataset / split / "labels").glob("*.txt"):
            text = label_path.read_text().strip()
            if not text:
                errors.append(f"{split}: empty label {label_path.name}")
                continue
            for ln, line in enumerate(text.splitlines(), 1):
                parts = line.split()
                cls = int(parts[0])
                coords = [float(v) for v in parts[1:]]
                if not 0 <= cls < n_classes:
                    errors.append(f"{split}:{label_path.name}:{ln} class {cls} out of range")
                if len(coords) % 2 or len(coords) < 6:
                    errors.append(f"{split}:{label_path.name}:{ln} malformed polygon ({len(coords)} values)")
                if any(v < 0.0 or v > 1.0 for v in coords):
                    errors.append(f"{split}:{label_path.name}:{ln} denormalised coordinate")
                counts[cls] += 1

    for cls_id, name in cfg["names"].items():
        if counts[int(cls_id)] < MIN_INSTANCES_PER_CLASS:
            errors.append(f"class starvation: {name} has {counts[int(cls_id)]} instances "
                          f"(minimum {MIN_INSTANCES_PER_CLASS})")

    if errors:
        print(f"DATA CONTRACT FAILED — {len(errors)} problems")
        for e in errors[:40]:
            print(" -", e)
        return 1
    print(f"DATA CONTRACT OK — {sum(counts.values())} instances across {n_classes} classes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
