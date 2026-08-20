import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  CameraType,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalysisResults } from '../components/AnalysisResults';
import { analyzePlateImage } from '../services/inference-api';
import type {
  AnalysisImage,
  DetectionResult,
} from '../types/inference';

type AnalysisStatus = 'idle' | 'capturing' | 'analyzing' | 'success' | 'error';

export default function AnalyzeScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [image, setImage] = useState<AnalysisImage | null>(null);
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runAnalysis = useCallback(async (selectedImage: AnalysisImage) => {
    setImage(selectedImage);
    setStatus('analyzing');
    setErrorMessage(null);
    setResults([]);

    try {
      const detections = await analyzePlateImage(selectedImage);
      setResults(detections);
      setStatus('success');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Une erreur inattendue est survenue pendant l’analyse.',
      );
      setStatus('error');
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!cameraReady || !cameraRef.current || status !== 'idle') {
      return;
    }

    setStatus('capturing');
    setErrorMessage(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo) {
        throw new Error('La caméra n’a retourné aucune photo.');
      }

      await runAnalysis({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        fileName: `meal-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de prendre la photo.',
      );
    }
  }, [cameraReady, runAnalysis, status]);

  const pickFromGallery = useCallback(async () => {
    if (status !== 'idle') {
      return;
    }

    const mediaPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!mediaPermission.granted) {
      setStatus('error');
      setErrorMessage(
        'L’accès à la photothèque est nécessaire pour choisir une image.',
      );
      return;
    }

    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (selection.canceled) {
      return;
    }

    const asset = selection.assets[0];
    await runAnalysis({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  }, [runAnalysis, status]);

  const resetAnalysis = useCallback(() => {
    setImage(null);
    setResults([]);
    setErrorMessage(null);
    setStatus('idle');
  }, []);

  const retryAnalysis = useCallback(() => {
    if (image) {
      void runAnalysis(image);
    }
  }, [image, runAnalysis]);

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#10b981" size="large" />
        <Text className="mt-4 text-sm text-white/70">
          Initialisation de la caméra…
        </Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-margin-mobile">
        <View className="w-full max-w-md items-center rounded-2xl bg-surface-container-lowest p-md">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MaterialIcons name="photo-camera" size={32} color="#006c49" />
          </View>
          <Text className="text-center text-xl font-bold text-on-surface">
            Autoriser la caméra
          </Text>
          <Text className="mt-2 text-center text-sm text-on-surface-variant">
            NutriVision utilise la caméra uniquement pour photographier le repas
            à analyser.
          </Text>
          <TouchableOpacity
            className="mt-6 w-full items-center rounded-xl bg-primary py-4"
            onPress={() => {
              if (permission.canAskAgain) {
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
          >
            <Text className="font-bold text-white">
              {permission.canAskAgain
                ? 'Autoriser la caméra'
                : 'Ouvrir les réglages'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="mt-3 w-full items-center rounded-xl border border-outline-variant py-4"
            onPress={() => void pickFromGallery()}
          >
            <Text className="font-bold text-on-surface">
              Choisir dans la galerie
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'success' && image) {
    return (
      <AnalysisResults
        imageUri={image.uri}
        results={results}
        onAnalyzeAgain={resetAnalysis}
      />
    );
  }

  const busy = status === 'capturing' || status === 'analyzing';

  return (
    <View className="flex-1 bg-black">
      <View className="absolute inset-0">
        {image ? (
          <Image
            source={{ uri: image.uri }}
            className="h-full w-full opacity-80"
            resizeMode="cover"
          />
        ) : (
          <CameraView
            ref={cameraRef}
            className="h-full w-full"
            facing={facing}
            flash={flashEnabled ? 'on' : 'off'}
            onCameraReady={() => setCameraReady(true)}
          />
        )}
      </View>

      <SafeAreaView className="z-10 flex-1 justify-between" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between bg-black/50 px-margin-mobile py-4">
          <TouchableOpacity
            accessibilityLabel="Fermer l’analyse"
            className="rounded-full bg-black/30 p-2"
            onPress={() => router.replace('/')}
          >
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-base font-semibold tracking-wider text-white">
            ANALYSE IA
          </Text>
          <TouchableOpacity
            accessibilityLabel={
              flashEnabled ? 'Désactiver le flash' : 'Activer le flash'
            }
            className="rounded-full bg-black/30 p-2"
            disabled={Boolean(image)}
            onPress={() => setFlashEnabled((enabled) => !enabled)}
          >
            <MaterialIcons
              name={flashEnabled ? 'flash-on' : 'flash-off'}
              size={24}
              color={image ? '#777777' : '#ffffff'}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-margin-mobile">
          {busy ? (
            <View className="items-center rounded-2xl bg-black/70 px-8 py-6">
              <ActivityIndicator color="#10b981" size="large" />
              <Text className="mt-4 text-base font-semibold text-white">
                {status === 'capturing'
                  ? 'Capture de la photo…'
                  : 'Analyse du repas…'}
              </Text>
              <Text className="mt-1 text-center text-xs text-white/60">
                Cette opération peut prendre quelques secondes.
              </Text>
            </View>
          ) : status === 'error' ? (
            <View className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-md">
              <View className="flex-row items-center">
                <MaterialIcons name="error-outline" size={26} color="#ba1a1a" />
                <Text className="ml-2 flex-1 text-base font-bold text-error">
                  Analyse impossible
                </Text>
              </View>
              <Text className="mt-3 text-sm text-on-surface-variant">
                {errorMessage}
              </Text>
              <View className="mt-5 flex-row gap-3">
                {image && (
                  <TouchableOpacity
                    className="flex-1 items-center rounded-xl bg-primary py-3"
                    onPress={retryAnalysis}
                  >
                    <Text className="font-bold text-white">Réessayer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  className="flex-1 items-center rounded-xl border border-outline-variant py-3"
                  onPress={resetAnalysis}
                >
                  <Text className="font-bold text-on-surface">Recommencer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="relative h-64 w-64 items-center justify-center rounded-3xl border-2 border-white/40">
              <View className="absolute left-0 top-0 h-6 w-6 rounded-tl-md border-l-4 border-t-4 border-primary" />
              <View className="absolute right-0 top-0 h-6 w-6 rounded-tr-md border-r-4 border-t-4 border-primary" />
              <View className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-md border-b-4 border-l-4 border-primary" />
              <View className="absolute bottom-0 right-0 h-6 w-6 rounded-br-md border-b-4 border-r-4 border-primary" />
              <View className="absolute top-1/2 h-1 w-full bg-primary/80" />
              <Text className="rounded-full bg-black/50 px-3 py-1 text-center text-xs font-medium text-white/70">
                Placer le repas au centre
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-around bg-black/70 px-margin-mobile py-6">
          <TouchableOpacity
            accessibilityLabel="Choisir une image dans la galerie"
            className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
            disabled={busy}
            onPress={() => void pickFromGallery()}
          >
            <MaterialIcons name="image" size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Prendre une photo"
            className="h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white"
            disabled={busy || status === 'error' || !cameraReady}
            onPress={() => void capturePhoto()}
          >
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <MaterialIcons name="photo-camera" size={32} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Changer de caméra"
            className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
            disabled={busy || Boolean(image)}
            onPress={() =>
              setFacing((current) => (current === 'back' ? 'front' : 'back'))
            }
          >
            <MaterialIcons name="flip-camera-ios" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
