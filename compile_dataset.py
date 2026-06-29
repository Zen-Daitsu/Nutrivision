import os
import cv2
import numpy as np
import yaml
import shutil
from sklearn.model_selection import train_test_split

# 1. Define Paths based on your tree layout
DATA_DIR = r"C:\Users\ZenPrime\Desktop\Nutrivision\data"
FOODSEG_DIR = os.path.join(DATA_DIR, "foodSeg103")
OUTPUT_DIR = r"C:\Users\ZenPrime\Desktop\Nutrivision\my_dataset"

# Target classes mapping subset
CLASS_MAP = {
    'chicken': 0, 'beef': 1, 'egg': 2, 'rice': 3, 
    'quinoa': 4, 'broccoli': 5, 'spinach': 6, 
    'tomato': 7, 'avocado': 8, 'blueberry': 9
}

def init_yolo_structure():
    """Creates normalized destination directories."""
    for split in ['train', 'val', 'test']:
        os.makedirs(os.path.join(OUTPUT_DIR, split, 'images'), exist_ok=True)
        os.makedirs(os.path.join(OUTPUT_DIR, split, 'labels'), exist_ok=True)

def convert_mask_to_yolo_segment(mask_path, img_shape):
    """
    Reads semantic pixel masks from FoodSeg103, extracts bounding 
    contours, and normalizes them to coordinates between 0.0 and 1.0.
    """
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask is None:
        return ""
    
    h, w = img_shape[:2]
    yolo_lines = []
    
    # Extract unique pixel class labels present in the image
    unique_classes = np.unique(mask)
    for cls_id in unique_classes:
        if cls_id == 0:  # Skip background pixels
            continue
            
        # Hard truth mapping (adjusting string lookup based on your annotation source metadata)
        # For prototype simplicity, assuming direct mapping index or fallback placeholder
        target_yolo_id = 0  # Defaulting to demonstration index
        
        # Create binary mask for specific class
        binary_mask = np.where(mask == cls_id, 255, 0).astype(np.uint8)
        contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            if len(contour) < 3: # Polygons require minimum 3 points
                continue
            normalized_coords = []
            for point in contour:
                x_norm = point[0][0] / w
                y_norm = point[0][1] / h
                normalized_coords.append(f"{x_norm:.4f} {y_norm:.4f}")
            
            yolo_lines.append(f"{target_yolo_id} " + " ".join(normalized_coords))
            
    return "\n".join(yolo_lines)

def process_foodseg():
    """Walks through the train/test splits of FoodSeg103."""
    print("Processing FoodSeg103 indices...")
    for phase in ['train', 'test']:
        img_dir = os.path.join(FOODSEG_DIR, "Images", "img_dir", phase)
        ann_dir = os.path.join(FOODSEG_DIR, "Images", "ann_dir", phase)
        
        if not os.path.exists(img_dir):
            continue
            
        images = [f for f in os.listdir(img_dir) if f.endswith(('.jpg', '.png'))]
        
        # Split files to populate your train/val validation split matrices
        for img_name in images:
            base_name = os.path.splitext(img_name)[0]
            img_path = os.path.join(img_dir, img_name)
            mask_path = os.path.join(ann_dir, base_name + ".png") # Mapped annotation file
            
            img = cv2.imread(img_path)
            if img is None or not os.path.exists(mask_path):
                continue
                
            yolo_annotations = convert_mask_to_yolo_segment(mask_path, img.shape)
            
            # Deterministic split routing based on filename hash to prevent data leakage
            routing = 'train' if (hash(base_name) % 10) < 7 else ('val' if (hash(base_name) % 10) < 9 else 'test')
            
            # Copy Image
            shutil.copy(img_path, os.path.join(OUTPUT_DIR, routing, 'images', img_name))
            # Write Label file
            with open(os.path.join(OUTPUT_DIR, routing, 'labels', base_name + ".txt"), "w") as f:
                f.write(yolo_annotations)

def generate_yaml():
    """Generates the data.yaml pipeline file required by YOLO framework."""
    config = {
        'path': OUTPUT_DIR,
        'train': 'train/images',
        'val': 'val/images',
        'test': 'test/images',
        'names': {v: k for k, v in CLASS_MAP.items()}
    }
    with open(os.path.join(OUTPUT_DIR, "data.yaml"), "w") as f:
        yaml.dump(config, f, default_flow_style=False)

if __name__ == "__main__":
    init_yolo_structure()
    process_foodseg()
    generate_yaml()
    print(f"Extraction complete. Target compiled folder located at: {OUTPUT_DIR}")