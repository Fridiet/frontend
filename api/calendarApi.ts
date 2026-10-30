import apiClient from "./client";
import type { UnitType } from "../types/fridge";

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type MealConsumptionResponse = {
  consumptionId: number;
  batchId: number;
  ingredientName: string;
  quantityUsed: number | null;
  unit: string | null;
  remainingQuantity: number | null;
  customQuantity?: number | null;
  preCustomQuantityText?: string | null;
  unitType?: UnitType;
  customText?: string | null;
};

export type MealRecordResponse = {
  mealEventId: number;
  fridgeId: number;
  ownerUserId: number;
  title: string;
  mealType: MealType;
  note: string | null;
  imageUrl: string | null;
  eatenAt: string;
  consumedItems: MealConsumptionResponse[];
};

export type MealImageAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export type MealRecordPayload = {
  requestId?: string;
  fridgeId: number;
  title: string;
  mealType: MealType;
  note?: string;
  imageUrl?: string;
  eatenAt: string;
  usedIngredients: Array<{
    batchId: number;
    unitType: UnitType;
    quantityUsed?: number;
    unit?: string;
    customText?: string;
  }>;
};

export async function getMealHistory(userId: number) {
  const response = await apiClient.get<MealRecordResponse[]>("/api/calendar/meals", {
    params: { userId },
  });
  return response.data;
}

export async function createMealRecord(payload: MealRecordPayload) {
  const response = await apiClient.post<MealRecordResponse>(
    "/api/calendar/meals",
    payload,
  );
  return response.data;
}

export type MealMutationPayload = Omit<MealRecordPayload, "fridgeId" | "imageUrl"> & { imageUrl?: string | null };

export async function updateMealRecord(mealEventId: number, payload: MealMutationPayload) {
  await apiClient.put(`/api/calendar/${mealEventId}`, payload);
}

export async function deleteMealRecord(mealEventId: number) {
  await apiClient.delete(`/api/calendar/${mealEventId}`);
}

export async function uploadMealImage(asset: MealImageAsset) {
  const formData = new FormData();

  if (asset.uri.startsWith("blob:")) {
    const assetResponse = await fetch(asset.uri);
    if (!assetResponse.ok) {
      throw new Error("선택한 식사 사진을 불러오지 못했습니다.");
    }
    const blob = await assetResponse.blob();
    const uploadBlob = blob.type
      ? blob
      : new Blob([blob], { type: asset.mimeType });
    formData.append("file", uploadBlob, asset.fileName);
  } else {
    formData.append("file", {
      uri: asset.uri,
      name: asset.fileName,
      type: asset.mimeType,
    } as unknown as Blob);
  }

  const response = await apiClient.post<{ imageUrl: string }>(
    "/api/upload/meal-image",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  if (!response.data.imageUrl?.trim()) {
    throw new Error("업로드된 사진 주소를 받지 못했습니다.");
  }
  return response.data.imageUrl;
}
