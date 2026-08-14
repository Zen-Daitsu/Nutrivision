import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-margin-mobile py-4" showsVerticalScrollIndicator={false}>
        
        {/* Infos Utilisateur */}
        <View className="items-center my-6">
          <View className="w-24 h-24 rounded-full bg-primary/20 border-4 border-primary items-center justify-center mb-3">
            <MaterialIcons name="person" size={48} color="#006c49" />
          </View>
          <Text className="text-xl font-bold text-on-surface">Développeur NutriVision</Text>
          <Text className="text-xs text-on-surface-variant">Profil Nutritionnel Actif</Text>
        </View>

        {/* Préférences & Objectifs */}
        <Text className="text-base font-bold text-on-surface mb-3">Vos Paramètres</Text>

        <View className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm mb-6">
          <View className="flex-row justify-between items-center p-sm border-b border-outline-variant/10">
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="restaurant" size={20} color="#006c49" />
              <Text className="text-sm font-medium text-on-surface">Régime Alimentaire</Text>
            </View>
            <Text className="text-xs font-bold text-primary uppercase">Cétogène (Keto)</Text>
          </View>

          <View className="flex-row justify-between items-center p-sm border-b border-outline-variant/10">
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="track-changes" size={20} color="#006c49" />
              <Text className="text-sm font-medium text-on-surface">Objectif Énergie</Text>
            </View>
            <Text className="text-sm font-semibold text-on-surface-variant">2 200 kcal / jour</Text>
          </View>

          <View className="flex-row justify-between items-center p-sm">
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="scale" size={20} color="#006c49" />
              <Text className="text-sm font-medium text-on-surface">Poids cible</Text>
            </View>
            <Text className="text-sm font-semibold text-on-surface-variant">Stable</Text>
          </View>
        </View>

        {/* Bouton Déconnexion / Reset */}
        <TouchableOpacity className="border border-error/30 w-full py-4 rounded-xl items-center justify-center active:bg-error-container/20">
          <Text className="text-error font-bold text-sm">Réinitialiser les données</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
