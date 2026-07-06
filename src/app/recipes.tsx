import React from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialSymbols } from '@expo/vector-icons';

export default function RecipesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-margin-mobile py-4 border-b border-outline-variant/10">
        <Text className="text-xs font-bold tracking-widest text-primary uppercase">Suggestions IA</Text>
        <Text className="font-headline-sm text-xl font-bold text-on-surface">Recettes Recommandées</Text>
      </View>

      <ScrollView className="flex-1 px-margin-mobile py-4" showsVerticalScrollIndicator={false}>
        {/* Bannière Recette à la une */}
        <TouchableOpacity className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm mb-6">
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80' }} 
            className="w-full h-48"
          />
          <View className="p-sm">
            <View className="flex-row gap-2 mb-2">
              <View className="bg-on-primary-container/10 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-primary uppercase">Idéal Keto</Text>
              </View>
              <View className="bg-surface-container px-2 py-0.5 rounded-full">
                <Text className="text-[10px] text-on-surface-variant font-medium">⚡ Prêt en 15 min</Text>
              </View>
            </View>
            <Text className="font-headline-sm text-lg font-bold text-on-surface">Pavé de Saumon croustillant et asperges</Text>
            <Text className="text-xs text-on-surface-variant mt-1" numberOfLines={2}>
              Une recette riche en oméga-3 et parfaitement calibrée pour maintenir votre état de cétose aujourd'hui.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Section Liste Bento */}
        <Text className="font-headline-sm text-base font-bold text-on-surface mb-3">Explorer par catégorie</Text>
        
        <View className="flex-row gap-4 mb-4">
          <TouchableOpacity className="flex-1 bg-surface-container-low p-sm rounded-xl items-center">
            <MaterialSymbols name="egg" size={32} color="#006c49" />
            <Text className="text-xs font-bold text-on-surface mt-2">Petit-déj</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 bg-surface-container-low p-sm rounded-xl items-center">
            <MaterialSymbols name="local_hospital" size={32} color="#9d4300" />
            <Text className="text-xs font-bold text-on-surface mt-2">Snacks</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 bg-surface-container-low p-sm rounded-xl items-center">
            <MaterialSymbols name="dinner_dining" size={32} color="#5d5f5f" />
            <Text className="text-xs font-bold text-on-surface mt-2">Dîner</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}