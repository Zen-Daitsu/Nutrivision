import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface MealCardProps {
  title: string;
  calories: number;
  period: string;
  time: string;
  tags: string[];
  imageUri: string;
}

export function MealCard({ title, calories, period, time, tags, imageUri }: MealCardProps) {
  return (
    <View className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm flex-row h-32">
      {/* Image Section */}
      <View className="w-1/3 relative">
        <Image source={{ uri: imageUri }} className="w-full h-full object-cover" />
        <View className="absolute top-2 left-2 bg-primary/90 px-2 py-0.5 rounded-full">
          <Text className="text-white text-[10px] font-bold uppercase tracking-wider">{period}</Text>
        </View>
      </View>

      {/* Content Section */}
      <View className="w-2/3 p-sm justify-between">
        <View>
          <View className="flex-row justify-between items-start">
            <Text className="font-headline-sm text-headline-sm text-on-surface flex-1 mr-2" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-primary font-bold text-label-md">{calories} kcal</Text>
          </View>
          
          <View className="flex-row gap-1 mt-2">
            {tags.map((tag, idx) => (
              <View key={idx} className="bg-surface-container px-2 py-0.5 rounded-full">
                <Text className="text-[10px] text-on-surface-variant font-medium">{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="flex-row items-center gap-1">
          {/* Remplacer par un vrai composant d'icône comme Lucide React Native ou Expo Vector Icons */}
          <Text className="text-on-surface-variant text-[11px]">{time}</Text>
        </View>
      </View>
    </View>
  );
}