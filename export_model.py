# export_model.py
from ultralytics import YOLO

def export_to_onnx():
    # Load your custom trained YOLO segmentation weights
    # (Using baseline yolov8n-seg.pt as placeholder until local training run completes)
    model = YOLO("yolov8n-seg.pt")
    
    # Export the model to ONNX format with dynamic axis shapes for flexible batch sizes
    success = model.export(format="onnx", dynamic=True, simplify=True)
    if success:
        print("Model successfully compiled to optimized ONNX format.")

if __name__ == "__main__":
    export_to_onnx()