import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAnalysisHistory, usePreferences } from '../providers/AppProviders';
import type { NutritionPreferences } from '../types/preferences';

type EditablePreferences = Record<keyof NutritionPreferences, string>;

function toEditable(preferences: NutritionPreferences): EditablePreferences {
  return {
    diet: preferences.diet,
    calorieTarget: String(preferences.calorieTarget),
    proteinTarget: String(preferences.proteinTarget),
    carbsTarget: String(preferences.carbsTarget),
    fatTarget: String(preferences.fatTarget),
    weightGoal: preferences.weightGoal,
  };
}

export default function ProfileScreen() {
  const { preferences, updatePreferences } = usePreferences();
  const { records, clearHistory } = useAnalysisHistory();
  const [draft, setDraft] = useState(() => toEditable(preferences));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => setDraft(toEditable(preferences)), [preferences]);

  const updateField = (field: keyof EditablePreferences, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  };

  const save = async () => {
    const numericFields = [
      Number(draft.calorieTarget),
      Number(draft.proteinTarget),
      Number(draft.carbsTarget),
      Number(draft.fatTarget),
    ];
    if (numericFields.some((value) => !Number.isFinite(value) || value <= 0)) {
      setFeedback('Tous les objectifs numériques doivent être supérieurs à zéro.');
      return;
    }
    setSaving(true);
    try {
      await updatePreferences({
        diet: draft.diet.trim() || 'Équilibré',
        calorieTarget: numericFields[0],
        proteinTarget: numericFields[1],
        carbsTarget: numericFields[2],
        fatTarget: numericFields[3],
        weightGoal: draft.weightGoal.trim() || 'Stable',
      });
      setFeedback('Objectifs enregistrés sur cet appareil.');
    } catch {
      setFeedback('Impossible d’enregistrer les objectifs localement.');
    } finally {
      setSaving(false);
    }
  };

  const confirmClearHistory = () => {
    Alert.alert(
      'Effacer l’historique ?',
      `Cette action supprimera ${records.length} analyse${records.length > 1 ? 's' : ''} et les photos associées de cet appareil.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            void clearHistory().catch(() => {
              Alert.alert('Erreur', 'Impossible d’effacer tout l’historique.');
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-margin-mobile py-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="my-6 items-center">
          <View className="mb-3 h-24 w-24 items-center justify-center rounded-full border-4 border-primary bg-primary/20">
            <MaterialIcons name="person" size={48} color="#006c49" />
          </View>
          <Text className="text-xl font-bold text-on-surface">Profil local</Text>
          <Text className="text-xs text-on-surface-variant">Données conservées sur cet appareil</Text>
        </View>

        <Text className="mb-3 text-base font-bold text-on-surface">Objectifs nutritionnels</Text>
        <View className="gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-sm shadow-sm">
          <PreferenceInput label="Régime alimentaire" value={draft.diet} onChangeText={(value) => updateField('diet', value)} />
          <PreferenceInput label="Objectif calorique" value={draft.calorieTarget} suffix="kcal / jour" keyboardType="numeric" onChangeText={(value) => updateField('calorieTarget', value)} />
          <PreferenceInput label="Protéines" value={draft.proteinTarget} suffix="g / jour" keyboardType="numeric" onChangeText={(value) => updateField('proteinTarget', value)} />
          <PreferenceInput label="Glucides" value={draft.carbsTarget} suffix="g / jour" keyboardType="numeric" onChangeText={(value) => updateField('carbsTarget', value)} />
          <PreferenceInput label="Lipides" value={draft.fatTarget} suffix="g / jour" keyboardType="numeric" onChangeText={(value) => updateField('fatTarget', value)} />
          <PreferenceInput label="Objectif de poids" value={draft.weightGoal} onChangeText={(value) => updateField('weightGoal', value)} />
        </View>

        {feedback && <Text className="mt-3 text-sm text-on-surface-variant">{feedback}</Text>}
        <TouchableOpacity className="mt-4 items-center rounded-xl bg-primary py-4" disabled={saving} onPress={() => void save()}>
          <Text className="font-bold text-white">{saving ? 'Enregistrement…' : 'Enregistrer les objectifs'}</Text>
        </TouchableOpacity>

        <View className="mt-lg rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-sm">
          <Text className="font-bold text-on-surface">Historique local</Text>
          <Text className="mt-1 text-sm text-on-surface-variant">
            {records.length} analyse{records.length > 1 ? 's' : ''} enregistrée{records.length > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity className="mt-4 w-full items-center rounded-xl border border-error/30 py-4" disabled={records.length === 0} onPress={confirmClearHistory}>
            <Text className={`text-sm font-bold ${records.length === 0 ? 'text-on-surface-variant' : 'text-error'}`}>
              Effacer l’historique et les photos
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PreferenceInput({
  label,
  value,
  suffix,
  keyboardType = 'default',
  onChangeText,
}: {
  label: string;
  value: string;
  suffix?: string;
  keyboardType?: 'default' | 'numeric';
  onChangeText: (value: string) => void;
}) {
  return (
    <View>
      <Text className="mb-1 text-xs font-semibold text-on-surface-variant">{label}</Text>
      <View className="flex-row items-center rounded-lg bg-surface-container-low px-3">
        <TextInput
          className="flex-1 py-3 text-base text-on-surface"
          value={value}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
        />
        {suffix && <Text className="ml-2 text-xs text-on-surface-variant">{suffix}</Text>}
      </View>
    </View>
  );
}
