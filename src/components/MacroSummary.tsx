// src/components/MacroSummary.tsx
import React from 'react';
import { View, Text } from 'react-native';
export function MacroSummary() {
  const caloriesConsumed = 1450;
  const caloriesTarget = 2200;
  const remaining = caloriesTarget - caloriesConsumed;

  return (
    <View className="bg-surface-container-lowest rounded-xl p-sm border border-outline-variant/20 shadow-sm mt-md">
      <View className="flex-row items-center justify-between">
        {/* Cercle de Progression Gauche */}
        <View className="w-1/2 items-center justify-center relative">
          <View className="w-32 h-32 rounded-full border-[10px] border-surface-container-high items-center justify-center">
            <View className="absolute inset-0 rounded-full border-[10px] border-primary border-r-transparent border-b-transparent rotate-45" />
            <Text className="text-on-surface text-center font-bold text-2xl">
              {remaining}
            </Text>
            <Text className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
              kcal restants
            </Text>
          </View>
        </View>

        {/* Liste des Macros à Droite */}
        <View className="w-1/2 pl-4 space-y-3">
          {/* Protéines */}
          <View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs font-bold text-on-surface">Protéines</Text>
              <Text className="text-xs text-on-surface-variant">95g / 140g</Text>
            </View>
            <View className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
              <View className="h-full bg-primary rounded-full" style={{ width: '67%' }} />
            </View>
          </View>

          {/* Glucides */}
          <View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs font-bold text-on-surface">Glucides</Text>
              <Text className="text-xs text-on-surface-variant">45g / 50g</Text>
            </View>
            <View className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
              <View className="h-full bg-secondary-container rounded-full" style={{ width: '90%' }} />
            </View>
          </View>

          {/* Lipides */}
          <View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs font-bold text-on-surface">Lipides</Text>
              <Text className="text-xs text-on-surface-variant">70g / 90g</Text>
            </View>
            <View className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
              <View className="h-full bg-tertiary rounded-full" style={{ width: '77%' }} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}