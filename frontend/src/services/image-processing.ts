import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  manipulateAsync,
  SaveFormat,
  type Action,
} from 'expo-image-manipulator';

import type { AnalysisImage } from '../types/inference';

const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Byte size of an image URI.
 *
 * expo-file-system is native-only: getInfoAsync throws on web. In a browser the
 * manipulator returns a blob: or data: URI, both of which fetch() can read, so
 * the blob's own size is the equivalent measurement.
 */
async function getFileSizeBytes(uri: string): Promise<number | null> {
  if (Platform.OS === 'web') {
    try {
      const blob = await (await fetch(uri)).blob();
      return blob.size;
    } catch {
      return null;   // unreadable: let the server's 413 be the backstop
    }
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists && 'size' in info && typeof info.size === 'number') {
    return info.size;
  }
  return null;
}

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

  const result = await manipulateAsync(image.uri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  const size = await getFileSizeBytes(result.uri);
  if (size !== null && size > MAX_FILE_SIZE_BYTES) {
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
