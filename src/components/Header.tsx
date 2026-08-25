import React from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function Header() {
  return (
    <View className="flex-row items-center justify-between border-b border-outline-variant/10 bg-background px-margin-mobile py-4">
      <View>
        <Text className="text-xs font-bold uppercase tracking-widest text-primary">NutriVision</Text>
        <Text className="text-xl font-bold text-on-surface">Votre journal nutritionnel</Text>
      </View>
      <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
        <MaterialIcons name="person" size={22} color="#006c49" />
      </View>
    </View>
  );
}
