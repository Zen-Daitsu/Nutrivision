import React, { useMemo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DetectionResult, MacroNutrients } from '../types/inference';

interface AnalysisResultsProps {
  imageUri: string;
  results: DetectionResult[];
  onAnalyzeAgain: () => void;
}

const EMPTY_MACROS: MacroNutrients = {
  protein: 0,
  carbs: 0,
  fat: 0,
  calories: 0,
};

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('fr-CA', {
    maximumFractionDigits,
  }).format(value);
}

export function AnalysisResults({
  imageUri,
  results,
  onAnalyzeAgain,
}: AnalysisResultsProps) {
  const totals = useMemo(
    () =>
      results.reduce<MacroNutrients>(
        (sum, detection) => ({
          protein: sum.protein + detection.estimated_macros.protein,
          carbs: sum.carbs + detection.estimated_macros.carbs,
          fat: sum.fat + detection.estimated_macros.fat,
          calories: sum.calories + detection.estimated_macros.calories,
        }),
        EMPTY_MACROS,
      ),
    [results],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="relative h-64">
          <Image
            source={{ uri: imageUri }}
            className="h-full w-full"
            resizeMode="cover"
          />
          <View className="absolute inset-x-0 top-0 flex-row items-center justify-between bg-black/50 px-margin-mobile py-4">
            <TouchableOpacity
              accessibilityLabel="Prendre une autre photo"
              className="rounded-full bg-black/30 p-2"
              onPress={onAnalyzeAgain}
            >
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-base font-semibold tracking-wider text-white">
              RÉSULTATS
            </Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <View className="px-margin-mobile">
          {results.length === 0 ? (
            <View className="mt-md items-center rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-md">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-container">
                <MaterialIcons
                  name="search-off"
                  size={32}
                  color="#3c4a42"
                />
              </View>
              <Text className="mt-4 text-center text-xl font-bold text-on-surface">
                Aucun aliment détecté
              </Text>
              <Text className="mt-2 text-center text-sm text-on-surface-variant">
                Essayez une photo plus lumineuse, prise directement au-dessus du
                repas.
              </Text>
            </View>
          ) : (
            <>
              <View className="mt-md rounded-2xl bg-primary p-md">
                <Text className="text-xs font-bold uppercase tracking-widest text-white/70">
                  Estimation totale
                </Text>
                <Text className="mt-1 text-3xl font-bold text-white">
                  {formatNumber(totals.calories, 0)} kcal
                </Text>
                <View className="mt-4 flex-row justify-between">
                  <MacroValue label="Protéines" value={totals.protein} />
                  <MacroValue label="Glucides" value={totals.carbs} />
                  <MacroValue label="Lipides" value={totals.fat} />
                </View>
              </View>

              <Text className="mb-3 mt-lg text-headline-sm font-bold text-on-surface">
                Aliments détectés
              </Text>
              <View className="gap-3">
                {results.map((detection, index) => (
                  <DetectionCard
                    key={`${detection.class_id}-${index}`}
                    detection={detection}
                  />
                ))}
              </View>
            </>
          )}

          <Text className="mt-md text-center text-xs text-on-surface-variant">
            Les valeurs nutritionnelles sont des estimations et peuvent être
            corrigées lorsque le backend prendra en charge les portions.
          </Text>

          <TouchableOpacity
            className="mt-6 items-center rounded-xl bg-primary py-4"
            onPress={onAnalyzeAgain}
          >
            <Text className="font-bold text-white">Analyser un autre repas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroValue({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text className="text-xs text-white/70">{label}</Text>
      <Text className="mt-1 text-base font-bold text-white">
        {formatNumber(value)} g
      </Text>
    </View>
  );
}

function DetectionCard({ detection }: { detection: DetectionResult }) {
  const macros = detection.estimated_macros;
  const coordinates = detection.box_coordinates
    .map((coordinate) => formatNumber(coordinate, 2))
    .join(', ');

  return (
    <View className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-sm">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-lg font-bold capitalize text-on-surface">
            {detection.name}
          </Text>
          <Text className="mt-1 text-xs text-on-surface-variant">
            Classe {detection.class_id} · Zone [{coordinates}]
          </Text>
        </View>
        <View className="rounded-full bg-primary/10 px-3 py-1">
          <Text className="text-xs font-bold text-primary">
            {formatNumber(detection.confidence * 100, 0)} %
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row justify-between border-t border-outline-variant/20 pt-3">
        <Nutrient label="Calories" value={macros.calories} unit="kcal" />
        <Nutrient label="Protéines" value={macros.protein} unit="g" />
        <Nutrient label="Glucides" value={macros.carbs} unit="g" />
        <Nutrient label="Lipides" value={macros.fat} unit="g" />
      </View>
    </View>
  );
}

function Nutrient({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <View className="items-center">
      <Text className="text-[10px] text-on-surface-variant">{label}</Text>
      <Text className="mt-1 text-xs font-bold text-on-surface">
        {formatNumber(value)} {unit}
      </Text>
    </View>
  );
}
