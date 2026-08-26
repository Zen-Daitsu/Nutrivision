import { Platform } from 'react-native';
import type {
  AnalysisImage,
  AnalysisResponse,
  DetectedItem,
  HealthResponse,
  Macros,
} from '../types/inference';

const ANALYSIS_PATH = '/api/v1/analyze';
const HEALTH_PATH = '/healthz';
const ANALYSIS_TIMEOUT_MS = 20_000;
const HEALTH_TIMEOUT_MS = 5_000;

export class InferenceApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'InferenceApiError';
  }
}

function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!configuredUrl) {
    throw new InferenceApiError(
      'Configurez EXPO_PUBLIC_API_URL dans un fichier .env avant de lancer l’analyse.',
    );
  }

  if (!/^https?:\/\//i.test(configuredUrl)) {
    throw new InferenceApiError(
      'EXPO_PUBLIC_API_URL doit commencer par http:// ou https://.',
    );
  }

  return configuredUrl.replace(/\/+$/, '');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMacros(value: unknown): value is Macros {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const macros = value as Record<string, unknown>;
  return (
    isFiniteNumber(macros.protein) &&
    isFiniteNumber(macros.carbs) &&
    isFiniteNumber(macros.fat) &&
    isFiniteNumber(macros.calories)
  );
}

function isDetectedItem(value: unknown): value is DetectedItem {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    Number.isInteger(item.class_id) &&
    typeof item.name === 'string' &&
    isFiniteNumber(item.confidence) &&
    Array.isArray(item.box_xyxy) &&
    item.box_xyxy.length === 4 &&
    item.box_xyxy.every(isFiniteNumber) &&
    isFiniteNumber(item.mask_area_px) &&
    isFiniteNumber(item.mass_g) &&
    (item.mass_confidence === 'high' ||
      item.mass_confidence === 'medium' ||
      item.mass_confidence === 'low') &&
    isMacros(item.macros) &&
    (item.fdc_id === null || Number.isInteger(item.fdc_id))
  );
}

export function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const response = value as Record<string, unknown>;
  return (
    Array.isArray(response.items) &&
    response.items.every(isDetectedItem) &&
    isMacros(response.totals) &&
    isFiniteNumber(response.inference_ms) &&
    isFiniteNumber(response.postprocess_ms) &&
    typeof response.source === 'string' &&
    (response.scale_px_per_mm === null ||
      isFiniteNumber(response.scale_px_per_mm))
  );
}

function messageForStatus(status: number, detail?: string) {
  if (status === 413) {
    return 'L’image dépasse la limite de 8 Mo du serveur.';
  }
  if (status === 415) {
    return 'Format d’image non pris en charge. Utilisez une image JPEG, PNG ou WebP.';
  }
  if (status === 429) {
    return 'Le service reçoit trop de demandes. Réessayez dans quelques instants.';
  }
  return detail || `Le serveur a retourné l’erreur ${status}.`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendAnalysis(
  image: AnalysisImage,
  referenceWidthMm?: number,
) {
  const formData = new FormData();
  const fileName = image.fileName || `meal-${Date.now()}.jpg`;

  if (Platform.OS === 'web') {
    // Browsers require a real Blob. The React Native { uri, name, type } shape
    // serialises to "[object Object]" and the server receives no file at all.
    const raw = await (await fetch(image.uri)).blob();
    const blob = raw.type ? raw : new Blob([raw], { type: 'image/jpeg' });
    formData.append('file', blob, fileName);
  } else {
    formData.append(
      'file',
      {
        uri: image.uri,
        name: fileName,
        type: 'image/jpeg',
      } as unknown as Blob,
    );
  }

  if (referenceWidthMm && referenceWidthMm > 0) {
    formData.append('reference_width_mm', String(referenceWidthMm));
  }

  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}${ANALYSIS_PATH}`,
    { method: 'POST', body: formData },
    ANALYSIS_TIMEOUT_MS,
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload &&
      typeof payload === 'object' &&
      'detail' in payload &&
      typeof payload.detail === 'string'
        ? payload.detail
        : undefined;
    throw new InferenceApiError(
      messageForStatus(response.status, detail),
      response.status,
    );
  }

  if (!isAnalysisResponse(payload)) {
    throw new InferenceApiError(
      'La réponse du serveur ne respecte pas le format attendu.',
    );
  }
  return payload;
}

export async function analyzePlateImage(
  image: AnalysisImage,
  referenceWidthMm?: number,
): Promise<AnalysisResponse> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await sendAnalysis(image, referenceWidthMm);
    } catch (error) {
      if (error instanceof InferenceApiError) {
        throw error;
      }
      const timedOut = error instanceof Error && error.name === 'AbortError';
      if (attempt === 1) {
        throw new InferenceApiError(
          timedOut
            ? 'Le serveur met trop de temps à répondre. Réessayez dans quelques instants.'
            : 'Impossible de joindre le serveur NutriVision. Vérifiez son adresse et votre connexion réseau.',
        );
      }
    }
  }
  throw new InferenceApiError('Impossible de lancer l’analyse.');
}

export async function checkApiHealth(): Promise<HealthResponse> {
  try {
    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}${HEALTH_PATH}`,
      { method: 'GET' },
      HEALTH_TIMEOUT_MS,
    );
    const payload: unknown = await response.json().catch(() => null);
    if (
      !response.ok ||
      !payload ||
      typeof payload !== 'object' ||
      !('status' in payload) ||
      typeof payload.status !== 'string'
    ) {
      throw new InferenceApiError('Le service d’analyse est indisponible.');
    }
    return payload as HealthResponse;
  } catch (error) {
    if (error instanceof InferenceApiError) {
      throw error;
    }
    throw new InferenceApiError('Le service d’analyse est indisponible.');
  }
}
