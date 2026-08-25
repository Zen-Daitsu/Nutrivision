import React from 'react';
import { Image, Text, View } from 'react-native';

import type { AnalysisRecord } from '../types/inference';

export function MealCard({ record }: { record: AnalysisRecord }) {
  const names = record.response.items.map((item) => item.name);
  const title = names.length ? names.slice(0, 2).join(', ') : 'Aucun aliment détecté';
  const extra = Math.max(0, names.length - 2);
  const date = new Date(record.createdAt);

  return (
    <View className="h-32 flex-row overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <Image source={{ uri: record.imageUri }} className="h-full w-1/3" resizeMode="cover" />
      <View className="w-2/3 justify-between p-sm">
        <View>
          <View className="flex-row items-start justify-between">
            <Text className="mr-2 flex-1 text-base font-bold capitalize text-on-surface" numberOfLines={2}>
              {title}
            </Text>
            <Text className="text-xs font-bold text-primary">
              {Math.round(record.response.totals.calories)} kcal
            </Text>
          </View>
          {extra > 0 && (
            <Text className="mt-1 text-xs text-on-surface-variant">+ {extra} autre{extra > 1 ? 's' : ''}</Text>
          )}
        </View>
        <Text className="text-[11px] text-on-surface-variant">
          {date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })} · {date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}
