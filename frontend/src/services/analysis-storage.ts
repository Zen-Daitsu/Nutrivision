import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { isAnalysisResponse } from './inference-api';
import type {
  AnalysisImage,
  AnalysisRecord,
  AnalysisResponse,
} from '../types/inference';

const HISTORY_KEY = '@nutrivision/analysis-history/v1';

/**
 * Native persists full-resolution JPEGs to the document directory, so fifty
 * records cost disk the user already has. On web the same records live in
 * localStorage, which browsers cap at roughly 5 MB per origin — fifty 1280 px
 * frames would exceed that several times over. Web therefore keeps fewer
 * records and stores a downscaled thumbnail rather than the original.
 */
const MAX_RECORDS = Platform.OS === 'web' ? 20 : 50;
const WEB_THUMB_MAX_EDGE = 320;
const WEB_THUMB_QUALITY = 0.6;

function isAnalysisRecord(value: unknown): value is AnalysisRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.imageUri === 'string' &&
    typeof record.imageWidth === 'number' &&
    typeof record.imageHeight === 'number' &&
    isAnalysisResponse(record.response)
  );
}

function getHistoryDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Le stockage local n’est pas disponible sur cet appareil.');
  }
  return `${FileSystem.documentDirectory}analysis-history/`;
}

/**
 * Downscale to a data URL small enough to survive in localStorage.
 * A blob: URI would be cheaper but is revoked on reload, leaving the history
 * screen with broken thumbnails after every refresh.
 */
async function makeWebThumbnail(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const bitmap = await createImageBitmap(blob);

  const ratio = Math.min(
    1,
    WEB_THUMB_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close?.();
    throw new Error('Canvas indisponible pour générer la vignette.');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL('image/jpeg', WEB_THUMB_QUALITY);
}

/** Native writes a file; web returns a self-contained data URL. */
async function persistImage(image: AnalysisImage, id: string): Promise<string> {
  if (Platform.OS === 'web') {
    return makeWebThumbnail(image.uri);
  }

  const directory = getHistoryDirectory();
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const imageUri = `${directory}${id}.jpg`;
  await FileSystem.copyAsync({ from: image.uri, to: imageUri });
  return imageUri;
}

/** No-op on web: a data URL owns no external resource to release. */
async function removeImageIfPresent(uri: string) {
  if (Platform.OS === 'web' || uri.startsWith('data:')) {
    return;
  }
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

/**
 * Write, and on a browser quota rejection drop the oldest records and retry
 * rather than losing the analysis the user just ran.
 */
async function writeHistory(records: AnalysisRecord[]): Promise<AnalysisRecord[]> {
  let attempt = [...records];

  for (let i = 0; i < 4; i += 1) {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(attempt));
      return attempt;
    } catch (error) {
      const quotaExceeded =
        error instanceof Error &&
        /quota|exceeded|storage/i.test(`${error.name} ${error.message}`);
      if (!quotaExceeded || attempt.length <= 1) {
        throw error;
      }
      attempt = attempt.slice(0, Math.max(1, Math.floor(attempt.length / 2)));
    }
  }

  throw new Error('Impossible d’enregistrer l’historique local.');
}

export async function loadAnalysisHistory(): Promise<AnalysisRecord[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAnalysisRecord) : [];
  } catch {
    return [];
  }
}

export async function saveAnalysisRecord(
  image: AnalysisImage,
  response: AnalysisResponse,
  currentRecords: AnalysisRecord[],
): Promise<AnalysisRecord[]> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const imageUri = await persistImage(image, id);

  const record: AnalysisRecord = {
    id,
    createdAt: new Date().toISOString(),
    imageUri,
    imageWidth: image.width,
    imageHeight: image.height,
    response,
  };

  const nextRecords = [record, ...currentRecords].slice(0, MAX_RECORDS);
  const removedRecords = currentRecords.slice(MAX_RECORDS - 1);

  const written = await writeHistory(nextRecords);

  await Promise.all(
    removedRecords.map((removed) => removeImageIfPresent(removed.imageUri)),
  );

  return written;
}

export async function clearAnalysisHistory() {
  const records = await loadAnalysisHistory();
  await Promise.all(records.map((record) => removeImageIfPresent(record.imageUri)));
  await AsyncStorage.removeItem(HISTORY_KEY);
}
