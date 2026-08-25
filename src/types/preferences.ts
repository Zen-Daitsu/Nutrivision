export interface NutritionPreferences {
  diet: string;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  weightGoal: string;
}

export const DEFAULT_PREFERENCES: NutritionPreferences = {
  diet: 'Équilibré',
  calorieTarget: 2200,
  proteinTarget: 140,
  carbsTarget: 250,
  fatTarget: 75,
  weightGoal: 'Stable',
};
