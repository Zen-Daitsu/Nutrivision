import type {
  AnalysisImage,
  DetectionResult,
} from '../types/inference';

const INFERENCE_PATH = '/api/v1/inference';
const REQUEST_TIMEOUT_MS = 30_000;

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

function inferMimeType(image: AnalysisImage) {
  if (image.mimeType) {
    return image.mimeType;
  }

  const extension = image.uri.split('.').pop()?.toLowerCase();
  if (extension === 'png') {
    return 'image/png';
  }
  if (extension === 'webp') {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function createFileName(image: AnalysisImage, mimeType: string) {
  if (image.fileName) {
    return image.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  const extension =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : 'jpg';
  return `meal-${Date.now()}.${extension}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDetectionResult(value: unknown): value is DetectionResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detection = value as Record<string, unknown>;
  const macros = detection.estimated_macros;

  return (
    Number.isInteger(detection.class_id) &&
    typeof detection.name === 'string' &&
    isFiniteNumber(detection.confidence) &&
    Array.isArray(detection.box_coordinates) &&
    detection.box_coordinates.every(isFiniteNumber) &&
    Boolean(macros) &&
    typeof macros === 'object' &&
    isFiniteNumber((macros as Record<string, unknown>).protein) &&
    isFiniteNumber((macros as Record<string, unknown>).carbs) &&
    isFiniteNumber((macros as Record<string, unknown>).fat) &&
    isFiniteNumber((macros as Record<string, unknown>).calories)
  );
}

export async function analyzePlateImage(
  image: AnalysisImage,
): Promise<DetectionResult[]> {
  const mimeType = inferMimeType(image);
  const formData = new FormData();
  const upload = {
    uri: image.uri,
    name: createFileName(image, mimeType),
    type: mimeType,
  };

  formData.append('file', upload as unknown as Blob);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}${INFERENCE_PATH}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        payload &&
        typeof payload === 'object' &&
        'detail' in payload &&
        typeof payload.detail === 'string'
          ? payload.detail
          : `Le serveur a retourné l’erreur ${response.status}.`;
      throw new InferenceApiError(detail, response.status);
    }

    if (!Array.isArray(payload) || !payload.every(isDetectionResult)) {
      throw new InferenceApiError(
        'La réponse du serveur ne respecte pas le format attendu.',
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof InferenceApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new InferenceApiError(
        'Le serveur met trop de temps à répondre. Réessayez dans quelques instants.',
      );
    }
    throw new InferenceApiError(
      'Impossible de joindre le serveur NutriVision. Vérifiez son adresse et votre connexion réseau.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
