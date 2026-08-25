import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

import { isAnalysisResponse } from './inference-api';
import type {
  AnalysisImage,
  AnalysisRecord,
  AnalysisResponse,
} from '../types/inference';

const HISTORY_KEY = '@nutrivision/analysis-history/v1';
const MAX_RECORDS = 50;

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

async function removeImageIfPresent(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
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
  const directory = getHistoryDirectory();
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const imageUri = `${directory}${id}.jpg`;
  await FileSystem.copyAsync({ from: image.uri, to: imageUri });

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
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextRecords));
  await Promise.all(
    removedRecords.map((removed) => removeImageIfPresent(removed.imageUri)),
  );
  return nextRecords;
}

export async function clearAnalysisHistory() {
  const records = await loadAnalysisHistory();
  await Promise.all(records.map((record) => removeImageIfPresent(record.imageUri)));
  await AsyncStorage.removeItem(HISTORY_KEY);
}
