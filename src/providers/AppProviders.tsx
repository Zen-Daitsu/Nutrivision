import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  clearAnalysisHistory,
  loadAnalysisHistory,
  saveAnalysisRecord,
} from '../services/analysis-storage';
import {
  loadPreferences,
  savePreferences,
} from '../services/preferences-storage';
import type {
  AnalysisImage,
  AnalysisRecord,
  AnalysisResponse,
} from '../types/inference';
import {
  DEFAULT_PREFERENCES,
  type NutritionPreferences,
} from '../types/preferences';

interface AnalysisHistoryContextValue {
  records: AnalysisRecord[];
  loading: boolean;
  addAnalysis: (
    image: AnalysisImage,
    response: AnalysisResponse,
  ) => Promise<void>;
  clearHistory: () => Promise<void>;
}

interface PreferencesContextValue {
  preferences: NutritionPreferences;
  loading: boolean;
  updatePreferences: (preferences: NutritionPreferences) => Promise<void>;
}

const AnalysisHistoryContext = createContext<
  AnalysisHistoryContextValue | undefined
>(undefined);
const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

export function AppProviders({ children }: PropsWithChildren) {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<NutritionPreferences>(DEFAULT_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  useEffect(() => {
    void loadAnalysisHistory()
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setHistoryLoading(false));
    void loadPreferences()
      .then(setPreferences)
      .catch(() => setPreferences(DEFAULT_PREFERENCES))
      .finally(() => setPreferencesLoading(false));
  }, []);

  const addAnalysis = useCallback(
    async (image: AnalysisImage, response: AnalysisResponse) => {
      const nextRecords = await saveAnalysisRecord(image, response, records);
      setRecords(nextRecords);
    },
    [records],
  );

  const clearHistory = useCallback(async () => {
    await clearAnalysisHistory();
    setRecords([]);
  }, []);

  const updatePreferences = useCallback(
    async (nextPreferences: NutritionPreferences) => {
      await savePreferences(nextPreferences);
      setPreferences(nextPreferences);
    },
    [],
  );

  const historyValue = useMemo(
    () => ({ records, loading: historyLoading, addAnalysis, clearHistory }),
    [records, historyLoading, addAnalysis, clearHistory],
  );
  const preferencesValue = useMemo(
    () => ({
      preferences,
      loading: preferencesLoading,
      updatePreferences,
    }),
    [preferences, preferencesLoading, updatePreferences],
  );

  return (
    <AnalysisHistoryContext.Provider value={historyValue}>
      <PreferencesContext.Provider value={preferencesValue}>
        {children}
      </PreferencesContext.Provider>
    </AnalysisHistoryContext.Provider>
  );
}

export function useAnalysisHistory() {
  const context = useContext(AnalysisHistoryContext);
  if (!context) {
    throw new Error('useAnalysisHistory doit être utilisé dans AppProviders.');
  }
  return context;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences doit être utilisé dans AppProviders.');
  }
  return context;
}
