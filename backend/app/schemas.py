"""Response contract. Frozen — the frontend and the CI data-contract test both bind to this."""
from __future__ import annotations

from pydantic import BaseModel, Field


class Macros(BaseModel):
    protein: float = Field(ge=0, description="grams")
    carbs: float = Field(ge=0, description="grams")
    fat: float = Field(ge=0, description="grams")
    calories: float = Field(ge=0, description="kcal")


class DetectedItem(BaseModel):
    class_id: int
    name: str
    confidence: float = Field(ge=0, le=1)
    box_xyxy: list[float] = Field(min_length=4, max_length=4, description="pixels, original frame")
    mask_area_px: int
    mass_g: float
    mass_confidence: str = Field(description="high | medium | low")
    macros: Macros
    fdc_id: int | None = None


class AnalysisResponse(BaseModel):
    items: list[DetectedItem]
    totals: Macros
    inference_ms: float
    postprocess_ms: float
    source: str = Field(description="mojo | numpy")
    scale_px_per_mm: float | None = None
