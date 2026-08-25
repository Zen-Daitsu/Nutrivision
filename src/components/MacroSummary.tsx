import React from 'react';
import { Text, View } from 'react-native';

import type { Macros } from '../types/inference';
import type { NutritionPreferences } from '../types/preferences';

interface MacroSummaryProps {
  consumed: Macros;
  goals: NutritionPreferences;
}

function percent(value: number, target: number): `${number}%` {
  return `${Math.min(100, Math.max(0, (value / Math.max(target, 1)) * 100))}%`;
}

export function MacroSummary({ consumed, goals }: MacroSummaryProps) {
  const remaining = Math.max(0, goals.calorieTarget - consumed.calories);
  return (
    <View className="mt-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-sm shadow-sm">
      <Text className="text-xs font-bold uppercase tracking-widest text-primary">
        Aujourd’hui
      </Text>
      <View className="mt-3 flex-row items-center justify-between">
        <View className="w-2/5 items-center">
          <Text className="text-3xl font-bold text-on-surface">{Math.round(remaining)}</Text>
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            kcal restantes
          </Text>
          <Text className="mt-1 text-xs text-on-surface-variant">
            {Math.round(consumed.calories)} / {goals.calorieTarget}
          </Text>
        </View>
        <View className="w-3/5 gap-3 pl-4">
          <MacroProgress label="Protéines" value={consumed.protein} target={goals.proteinTarget} color="#006c49" />
          <MacroProgress label="Glucides" value={consumed.carbs} target={goals.carbsTarget} color="#fd761a" />
          <MacroProgress label="Lipides" value={consumed.fat} target={goals.fatTarget} color="#5d5f5f" />
        </View>
      </View>
    </View>
  );
}

function MacroProgress({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <View>
      <View className="mb-1 flex-row justify-between">
        <Text className="text-xs font-bold text-on-surface">{label}</Text>
        <Text className="text-xs text-on-surface-variant">
          {Math.round(value)} g / {target} g
        </Text>
      </View>
      <View className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
        <View className="h-full rounded-full" style={{ width: percent(value, target), backgroundColor: color }} />
      </View>
    </View>
  );
}
