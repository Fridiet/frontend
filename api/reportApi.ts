import apiClient from "./client";

export type MonthlyReport = {
  month: string;
  timezone: string;
  partialMonth: boolean;
  cookedCount: number;
  savedRecipeCount: number;
  activeDays: number;
  uniqueCookedRecipes: number;
  topRecipes: { recipeKey: string | null; recipeName: string; count: number }[];
  dailyActivity: { date: string; cookedCount: number; savedCount: number }[];
  summary: string;
  notes: string[];
  stockActivity: { ingredientName: string; unit: string; consumedQuantity: number | null; discardedQuantity: number | null; consumedRecords: number; discardedRecords: number }[];
};

export async function getMonthlyReport(month: string) {
  const response = await apiClient.get<MonthlyReport>("/api/reports/monthly", { params: { month } });
  return response.data;
}
