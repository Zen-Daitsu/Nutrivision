import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '../components/Header';
import { MacroSummary } from '../components/MacroSummary';
import { MealCard } from '../components/MealCard';
import { useAnalysisHistory, usePreferences } from '../providers/AppProviders';
import type { Macros } from '../types/inference';

const EMPTY_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function Dashboard() {
  const { records, loading } = useAnalysisHistory();
  const { preferences } = usePreferences();
  const todayRecords = useMemo(() => {
    const today = new Date().toDateString();
    return records.filter((record) => new Date(record.createdAt).toDateString() === today);
  }, [records]);
  const consumed = useMemo(
    () =>
      todayRecords.reduce<Macros>(
        (sum, record) => ({
          calories: sum.calories + record.response.totals.calories,
          protein: sum.protein + record.response.totals.protein,
          carbs: sum.carbs + record.response.totals.carbs,
          fat: sum.fat + record.response.totals.fat,
        }),
        EMPTY_MACROS,
      ),
    [todayRecords],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header />
      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <MacroSummary consumed={consumed} goals={preferences} />

        <View className="mb-sm mt-lg flex-row items-center justify-between">
          <Text className="text-headline-sm font-bold text-on-surface">Analyses récentes</Text>
          <View className="rounded-full bg-primary/10 px-3 py-1">
            <Text className="text-xs font-bold text-primary">{records.length} enregistrée{records.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator className="my-lg" color="#006c49" />
        ) : records.length === 0 ? (
          <View className="items-center rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-md">
            <MaterialIcons name="photo-camera" size={36} color="#006c49" />
            <Text className="mt-3 text-center text-lg font-bold text-on-surface">Votre journal est vide</Text>
            <Text className="mt-2 text-center text-sm text-on-surface-variant">
              Photographiez un repas pour créer votre première analyse réelle.
            </Text>
            <TouchableOpacity className="mt-5 rounded-xl bg-primary px-6 py-3" onPress={() => router.push('/analyze')}>
              <Text className="font-bold text-white">Analyser un repas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {records.slice(0, 10).map((record) => (
              <MealCard key={record.id} record={record} />
            ))}
          </View>
        )}

        <View className="mt-lg flex-row gap-sm">
          <View className="flex-1 rounded-xl bg-primary p-sm">
            <MaterialIcons name="today" size={22} color="#ffffff" />
            <Text className="mt-3 text-xs text-white/70">Analyses aujourd’hui</Text>
            <Text className="text-2xl font-bold text-white">{todayRecords.length}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-surface-container p-sm">
            <MaterialIcons name="speed" size={22} color="#006c49" />
            <Text className="mt-3 text-xs text-on-surface-variant">Dernière inférence</Text>
            <Text className="text-xl font-bold text-on-surface">
              {records[0] ? `${Math.round(records[0].response.inference_ms)} ms` : '—'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
