import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'; // Nettoyé
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { MacroSummary } from '../components/MacroSummary';
import { MealCard } from '../components/MealCard';
import { QuickTipCard } from '../components/QuickTipCard';

export default function Dashboard() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header />
      
      <ScrollView 
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Résumé d'aujourd'hui */}
        <MacroSummary />

        {/* CORRECTION : Remplacement du <div> par un <View> natif */}
        <View className="flex-row justify-between items-center mt-lg mb-sm">
          <Text className="font-headline-sm text-headline-sm text-on-surface">Dernières Analyses</Text>
          <TouchableOpacity>
            <Text className="text-primary font-label-md text-label-md">Voir tout</Text>
          </TouchableOpacity>
        </View>

        {/* Liste des repas */}
        <View className="space-y-sm">
          <MealCard 
            title="Toast Avocat & Œuf" 
            calories={420} 
            period="Matin" 
            time="Il y a 2h"
            tags={["Vegan (Alt)", "Haute Protéine"]}
            imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuDqO1xQeYtRGG6mX-byUyFGMoYMu-yLUZrjyBAHmrzQToJ_wjzTfNwTQX_yuh05mcy53ksojnB6yYVqCHCYQ4gpLQYxt4-vMeYG7bT0IT9Tvi1lHRGSOoomqzurqTewE4FZY6x30q5veDTFOQSZVwKJ5938gIlhSSjmxFhV0h-EYRMC9Ojd2WREyqSdLak81DrTHQ1P1ft0sz3yjWypPQ91FOUsa2ua5WywHbBuVaRToj5ikKRJKfTTd6sD7FyvS1GY7g90l_2Th8Q"
          />
        </View>

        {/* Quick Tips Bento Grid */}
        <View className="mt-lg flex-row gap-sm">
          <QuickTipCard 
            title="Hydratation" 
            value="1.2L / 2L" 
            icon="water_drop" 
            variant="high"
          />
          <QuickTipCard 
            title="Énergie" 
            value="Optimale" 
            icon="bolt" 
            variant="fixed"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}