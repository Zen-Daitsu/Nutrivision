import React from 'react';
import { View, Text } from 'react-native';

interface QuickTipCardProps {
  title: string;
  value: string;
  icon: string;
  variant: 'high' | 'fixed';
}

export function QuickTipCard({ title, value, variant }: QuickTipCardProps) {
  const isGreen = variant === 'high';

  return (
    <View 
      className={`flex-1 p-sm rounded-xl border ${
        isGreen 
          ? 'bg-on-primary-container/5 border-primary-container/20' 
          : 'bg-surface-container-lowest border-outline-variant/20'
      }`}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className={`text-xs font-bold uppercase tracking-wider ${isGreen ? 'text-primary' : 'text-on-surface-variant'}`}>
          {title}
        </Text>
      </View>
      <Text className="text-lg font-bold text-on-surface">{value}</Text>
    </View>
  );
}