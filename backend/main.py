# backend/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import uvicorn
import shutil
import os

app = FastAPI(title="NutriVision High-Performance Engine")

# Temporary cache storage for incoming streams
UPLOAD_DIR = "cache_inputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class MacroNutrients(BaseModel):
    protein: float
    carbs: float
    fat: float
    calories: float

class DetectionResult(BaseModel):
    class_id: int
    name: str
    confidence: float
    box_coordinates: list[float]
    estimated_macros: MacroNutrients

@app.post("/api/v1/inference", response_model=list[DetectionResult])
async def process_plate_image(file: UploadFile = File(...)):
    # Enforce strict validation constraints on image types
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Payload must be an image.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        # Stream file to disk to preserve RAM overhead
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # TODO: Route this image file path to the native Mojo inference core
        mock_results = [] # Placeholder for execution matrix response
        return mock_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean file cache immediately to avoid storage leak bottlenecks
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)