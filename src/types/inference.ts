export interface AnalysisImage {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface MacroNutrients {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface DetectionResult {
  class_id: number;
  name: string;
  confidence: number;
  box_coordinates: number[];
  estimated_macros: MacroNutrients;
}
