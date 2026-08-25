import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetectionOverlay } from './DetectionOverlay';
import type {
  AnalysisImage,
  AnalysisResponse,
  DetectedItem,
  MassConfidence,
} from '../types/inference';

interface AnalysisResultsProps {
  image: AnalysisImage;
  response: AnalysisResponse;
  notice?: string | null;
  onAnalyzeAgain: () => void;
}

const CONFIDENCE_LABELS: Record<MassConfidence, string> = {
  high: 'Portion fiable',
  medium: 'Portion estimée',
  low: 'Portion approximative',
};

const CONFIDENCE_STYLES: Record<MassConfidence, string> = {
  high: 'bg-primary/10 text-primary',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-error-container text-error',
};

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('fr-CA', { maximumFractionDigits }).format(value);
}

function getDisclosure(items: DetectedItem[]) {
  if (items.some((item) => item.mass_confidence === 'low')) {
    return 'Au moins une portion est calculée sans repère d’échelle. Les masses et nutriments sont donc approximatifs.';
  }
  if (items.some((item) => item.mass_confidence === 'medium')) {
    return 'Les portions sont estimées à partir de l’assiette détectée. Les valeurs peuvent varier.';
  }
  return 'Les portions utilisent un repère d’échelle détecté. Les valeurs nutritionnelles restent des estimations.';
}

export function AnalysisResults({
  image,
  response,
  notice,
  onAnalyzeAgain,
}: AnalysisResultsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const totals = response.totals;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="relative">
          <DetectionOverlay image={image} items={response.items} />
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
          {notice && (
            <View className="mt-md flex-row rounded-xl bg-error-container p-sm">
              <MaterialIcons name="warning-amber" size={20} color="#ba1a1a" />
              <Text className="ml-2 flex-1 text-xs text-error">{notice}</Text>
            </View>
          )}
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

          {response.items.length === 0 ? (
            <View className="mt-md items-center rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-md">
              <MaterialIcons name="search-off" size={36} color="#3c4a42" />
              <Text className="mt-3 text-center text-xl font-bold text-on-surface">
                Aucun aliment détecté
              </Text>
              <Text className="mt-2 text-center text-sm text-on-surface-variant">
                Essayez une photo plus lumineuse, prise directement au-dessus du repas.
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-3 mt-lg text-headline-sm font-bold text-on-surface">
                Aliments détectés
              </Text>
              <View className="gap-3">
                {response.items.map((item, index) => (
                  <DetectionCard
                    key={`${item.class_id}-${index}`}
                    item={item}
                    index={index}
                  />
                ))}
              </View>
              <View className="mt-md flex-row rounded-xl bg-surface-container p-sm">
                <MaterialIcons name="info-outline" size={20} color="#3c4a42" />
                <Text className="ml-2 flex-1 text-xs leading-5 text-on-surface-variant">
                  {getDisclosure(response.items)}
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            className="mt-md flex-row items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-sm"
            onPress={() => setShowDetails((current) => !current)}
          >
            <Text className="font-semibold text-on-surface">Détails techniques</Text>
            <MaterialIcons
              name={showDetails ? 'expand-less' : 'expand-more'}
              size={24}
              color="#3c4a42"
            />
          </TouchableOpacity>
          {showDetails && (
            <View className="rounded-b-xl bg-surface-container-low px-sm pb-sm">
              <DetailRow label="Inférence" value={`${formatNumber(response.inference_ms, 0)} ms`} />
              <DetailRow label="Post-traitement" value={`${formatNumber(response.postprocess_ms, 0)} ms`} />
              <DetailRow label="Moteur" value={response.source} />
              <DetailRow
                label="Échelle"
                value={
                  response.scale_px_per_mm === null
                    ? 'Non détectée'
                    : `${formatNumber(response.scale_px_per_mm, 2)} px/mm`
                }
              />
            </View>
          )}

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

function DetectionCard({ item, index }: { item: DetectedItem; index: number }) {
  return (
    <View className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-sm">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-lg font-bold capitalize text-on-surface">
            {index + 1}. {item.name}
          </Text>
          <Text className="mt-1 text-xs text-on-surface-variant">
            {formatNumber(item.mass_g, 0)} g · détection {formatNumber(item.confidence * 100, 0)} %
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${CONFIDENCE_STYLES[item.mass_confidence]}`}>
          <Text className={`text-[10px] font-bold ${CONFIDENCE_STYLES[item.mass_confidence]}`}>
            {CONFIDENCE_LABELS[item.mass_confidence]}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row justify-between border-t border-outline-variant/20 pt-3">
        <Nutrient label="Calories" value={item.macros.calories} unit="kcal" />
        <Nutrient label="Protéines" value={item.macros.protein} unit="g" />
        <Nutrient label="Glucides" value={item.macros.carbs} unit="g" />
        <Nutrient label="Lipides" value={item.macros.fat} unit="g" />
      </View>
    </View>
  );
}

function Nutrient({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View className="items-center">
      <Text className="text-[10px] text-on-surface-variant">{label}</Text>
      <Text className="mt-1 text-xs font-bold text-on-surface">
        {formatNumber(value)} {unit}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-outline-variant/20 py-2 last:border-b-0">
      <Text className="text-xs text-on-surface-variant">{label}</Text>
      <Text className="text-xs font-semibold text-on-surface">{value}</Text>
    </View>
  );
}
