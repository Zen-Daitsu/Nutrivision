import * as FileSystem from 'expo-file-system';
import {
  manipulateAsync,
  SaveFormat,
  type Action,
} from 'expo-image-manipulator';

import type { AnalysisImage } from '../types/inference';

const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export async function normalizeAnalysisImage(
  image: AnalysisImage,
): Promise<AnalysisImage> {
  const longestEdge = Math.max(image.width, image.height);
  const actions: Action[] = [];

  if (longestEdge > MAX_EDGE_PX) {
    const ratio = MAX_EDGE_PX / longestEdge;
    actions.push({
      resize: {
        width: Math.round(image.width * ratio),
        height: Math.round(image.height * ratio),
      },
    });
  }

  const result = await manipulateAsync(actions.length ? image.uri : image.uri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  const fileInfo = await FileSystem.getInfoAsync(result.uri);

  if (
    fileInfo.exists &&
    'size' in fileInfo &&
    typeof fileInfo.size === 'number' &&
    fileInfo.size > MAX_FILE_SIZE_BYTES
  ) {
    throw new Error(
      'L’image reste supérieure à 8 Mo après optimisation. Choisissez une image plus légère.',
    );
  }

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileName: `meal-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
  };
}
