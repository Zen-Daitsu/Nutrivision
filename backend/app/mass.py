"""Segmented area -> mass.

There is no depth sensor in a phone browser, so mass is a modelled quantity, not a
measurement. Two scale sources, in order of preference:

  1. Fiducial: a standard ID-1 card (85.60 mm wide) laid flat in frame gives px/mm
     directly. The frontend sends its width; a detector class `reference_card`
     supplies the pixel width.
  2. Plate prior: assume the largest circular contour is a plate of
     `default_plate_diameter_mm`. Cheap, and wrong whenever the plate is not standard.

Depth is approximated with a per-class shape factor h_eff = k * sqrt(A), which is
the standard "thin-solid" heuristic used in image-based dietary assessment work.
Reported mass_confidence reflects which scale source was used.
"""
from __future__ import annotations

from dataclasses import dataclass

# k in h_eff = k * sqrt(area_cm2). Calibrated by weighing reference portions.
SHAPE_FACTOR: dict[str, float] = {
    "chicken_breast": 0.42,
    "beef": 0.40,
    "egg": 0.55,
    "white_rice": 0.35,
    "rice": 0.35,
    "quinoa": 0.33,
    "broccoli": 0.48,
    "spinach": 0.20,
    "tomato": 0.45,
    "avocado": 0.50,
    "blueberry": 0.60,
}
DEFAULT_SHAPE_FACTOR = 0.38

DENSITY_G_CM3: dict[str, float] = {
    "chicken_breast": 1.04,
    "beef": 1.05,
    "egg": 1.03,
    "white_rice": 0.72,
    "rice": 0.72,
    "quinoa": 0.75,
    "broccoli": 0.37,
    "spinach": 0.20,
    "tomato": 0.95,
    "avocado": 0.92,
    "blueberry": 0.62,
}
DEFAULT_DENSITY = 0.85

MASS_CLAMP_G = (5.0, 800.0)


@dataclass(frozen=True)
class Scale:
    px_per_mm: float
    confidence: str          # high | medium | low


def scale_from_fiducial(card_width_px: float, card_width_mm: float) -> Scale:
    return Scale(px_per_mm=card_width_px / card_width_mm, confidence="high")


def scale_from_plate(plate_width_px: float, plate_diameter_mm: float) -> Scale:
    return Scale(px_per_mm=plate_width_px / plate_diameter_mm, confidence="medium")


def scale_from_frame(frame_width_px: float) -> Scale:
    """Last resort: assume the frame spans a 320 mm arm's-length field of view."""
    return Scale(px_per_mm=frame_width_px / 320.0, confidence="low")


def estimate_mass_g(name: str, mask_area_px: int, scale: Scale) -> float:
    if mask_area_px <= 0 or scale.px_per_mm <= 0:
        return 0.0
    px_per_cm = scale.px_per_mm * 10.0
    area_cm2 = mask_area_px / (px_per_cm ** 2)
    k = SHAPE_FACTOR.get(name, DEFAULT_SHAPE_FACTOR)
    height_cm = k * (area_cm2 ** 0.5)
    volume_cm3 = area_cm2 * height_cm
    mass = volume_cm3 * DENSITY_G_CM3.get(name, DEFAULT_DENSITY)
    return float(min(max(mass, MASS_CLAMP_G[0]), MASS_CLAMP_G[1]))
