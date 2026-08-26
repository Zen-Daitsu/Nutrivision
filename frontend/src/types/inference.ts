export interface AnalysisImage {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export type MassConfidence = 'high' | 'medium' | 'low';

export interface DetectedItem {
  class_id: number;
  name: string;
  confidence: number;
  box_xyxy: [number, number, number, number];
  mask_area_px: number;
  mass_g: number;
  mass_confidence: MassConfidence;
  macros: Macros;
  fdc_id: number | null;
}

export interface AnalysisResponse {
  items: DetectedItem[];
  totals: Macros;
  inference_ms: number;
  postprocess_ms: number;
  source: string;
  scale_px_per_mm: number | null;
}

export interface AnalysisRecord {
  id: string;
  createdAt: string;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  response: AnalysisResponse;
}

export interface HealthResponse {
  status: string;
  providers?: unknown;
  mojo?: unknown;
}
