"""Data contract: the response shape the PWA binds to must not drift."""
from app.schemas import AnalysisResponse


REQUIRED_ITEM_KEYS = {
    "class_id", "name", "confidence", "box_xyxy", "mask_area_px",
    "mass_g", "mass_confidence", "macros", "fdc_id",
}
REQUIRED_MACRO_KEYS = {"protein", "carbs", "fat", "calories"}


def test_response_schema_is_stable():
    schema = AnalysisResponse.model_json_schema()
    top = set(schema["properties"])
    assert {"items", "totals", "inference_ms", "postprocess_ms", "source"} <= top

    item = schema["$defs"]["DetectedItem"]["properties"]
    assert REQUIRED_ITEM_KEYS <= set(item)

    macros = schema["$defs"]["Macros"]["properties"]
    assert REQUIRED_MACRO_KEYS == set(macros)


def test_macros_reject_negative():
    import pytest
    from pydantic import ValidationError
    from app.schemas import Macros
    with pytest.raises(ValidationError):
        Macros(protein=-1, carbs=0, fat=0, calories=0)
