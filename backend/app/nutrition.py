"""USDA FoodData Central lookup, per-100 g, with a persistent cache and a local fallback.

FDC nutrient numbers used (values are always per 100 g of the food as described):
    1003  Protein                          g
    1004  Total lipid (fat)                g
    1005  Carbohydrate, by difference      g
    1008  Energy                           kcal
    2047  Energy (Atwater General Factors) kcal   <- Foundation foods often carry this instead
    2048  Energy (Atwater Specific Factors) kcal

Rate limit on the public key is 1,000 requests/hour per IP, so every resolved class
is cached to disk and to memory. The detector emits ~10 distinct classes: after the
first run the API is effectively never called again.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path

import httpx

log = logging.getLogger("nutrivision.nutrition")

PROTEIN, FAT, CARBS = 1003, 1004, 1005
ENERGY_IDS = (1008, 2048, 2047)

# YOLO class name -> the query that actually returns the right FDC entry.
# Left implicit, "chicken" returns breaded nuggets; be specific.
QUERY_ALIAS: dict[str, str] = {
    "chicken_breast": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    "chicken": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    "beef": "Beef, loin, top sirloin, steak, separable lean only, cooked, broiled",
    "egg": "Egg, whole, cooked, hard-boiled",
    "white_rice": "Rice, white, long-grain, regular, enriched, cooked",
    "rice": "Rice, white, long-grain, regular, enriched, cooked",
    "quinoa": "Quinoa, cooked",
    "broccoli": "Broccoli, cooked, boiled, drained, without salt",
    "spinach": "Spinach, raw",
    "tomato": "Tomatoes, red, ripe, raw, year round average",
    "avocado": "Avocados, raw, all commercial varieties",
    "blueberry": "Blueberries, raw",
}


class NutritionResolver:
    def __init__(self, api_key: str, base_url: str, cache_path: str, local_db_path: str):
        self._key = api_key
        self._base = base_url.rstrip("/")
        self._cache_path = Path(cache_path)
        self._cache: dict[str, dict] = {}
        self._local: dict[str, dict] = {}
        self._lock = asyncio.Lock()
        self._load_disk()
        self._load_local(Path(local_db_path))

    # ---------- persistence ----------
    def _load_disk(self) -> None:
        if self._cache_path.exists():
            try:
                self._cache = json.loads(self._cache_path.read_text())
            except json.JSONDecodeError:
                log.warning("USDA cache corrupt, starting empty")

    def _flush(self) -> None:
        self._cache_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._cache_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._cache, indent=1))
        os.replace(tmp, self._cache_path)

    def _load_local(self, path: Path) -> None:
        """Offline table keyed by class name, per 1 g. Ships with the image."""
        if not path.exists():
            return
        raw = json.loads(path.read_text())
        for entry in raw.values():
            self._local[entry["name"]] = {
                "protein_100g": entry["protein"] * 100,
                "carbs_100g": entry["carbs"] * 100,
                "fat_100g": entry["fat"] * 100,
                "kcal_100g": entry["calories"] * 100,
                "fdc_id": None,
                "source": "local",
            }

    # ---------- lookup ----------
    async def per_100g(self, class_name: str) -> dict:
        if class_name in self._cache:
            return self._cache[class_name]
        if not self._key:
            return self._fallback(class_name)

        async with self._lock:
            if class_name in self._cache:          # another coroutine may have filled it
                return self._cache[class_name]
            try:
                record = await self._fetch(class_name)
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                log.warning("FDC lookup failed for %s: %s", class_name, exc)
                return self._fallback(class_name)
            self._cache[class_name] = record
            self._flush()
            return record

    async def _fetch(self, class_name: str) -> dict:
        query = QUERY_ALIAS.get(class_name, class_name.replace("_", " "))
        params = {
            "query": query,
            "api_key": self._key,
            "dataType": ["Foundation", "SR Legacy"],
            "pageSize": 3,
            "requireAllWords": "false",
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(f"{self._base}/foods/search", params=params)
            res.raise_for_status()
            foods = res.json().get("foods") or []
        if not foods:
            raise ValueError("no FDC match")

        food = foods[0]
        by_id = {n.get("nutrientId"): n.get("value", 0.0) for n in food.get("foodNutrients", [])}
        kcal = next((by_id[i] for i in ENERGY_IDS if i in by_id), None)
        if kcal is None:                                  # derive with Atwater factors
            kcal = 4 * by_id.get(PROTEIN, 0) + 4 * by_id.get(CARBS, 0) + 9 * by_id.get(FAT, 0)
        return {
            "protein_100g": float(by_id.get(PROTEIN, 0.0)),
            "carbs_100g": float(by_id.get(CARBS, 0.0)),
            "fat_100g": float(by_id.get(FAT, 0.0)),
            "kcal_100g": float(kcal),
            "fdc_id": int(food["fdcId"]),
            "description": food.get("description", ""),
            "source": "usda",
        }

    def _fallback(self, class_name: str) -> dict:
        return self._local.get(
            class_name,
            {"protein_100g": 0.0, "carbs_100g": 0.0, "fat_100g": 0.0,
             "kcal_100g": 0.0, "fdc_id": None, "source": "unknown"},
        )


def scale_to_mass(per_100g: dict, mass_g: float) -> dict:
    f = mass_g / 100.0
    return {
        "protein": round(per_100g["protein_100g"] * f, 2),
        "carbs": round(per_100g["carbs_100g"] * f, 2),
        "fat": round(per_100g["fat_100g"] * f, 2),
        "calories": round(per_100g["kcal_100g"] * f, 1),
    }
