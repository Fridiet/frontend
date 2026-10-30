import apiClient from "./client";

import type { InventoryItem, UnitType } from "../types/fridge";

export type InventoryCreatePayload = {
  countBasis?: string | null;
  perCountQuantity?: number | null;
  perCountUnit?: string | null;
  fridgeId: number;
  ingredientName: string;
  unitType: UnitType;
  remainingQuantity: number | null;
  unit: string | null;
  customQuantityText: string | null;
  consumeByDate: string;
  locationCategory: string;
};

export type InventoryUpdatePayload = Omit<
  InventoryCreatePayload,
  "fridgeId" | "ingredientName"
>;

export interface OcrInventoryCreatePayload {
  ingredientName: string;
  unitType: UnitType;
  unit: string | null;
  quantity: number | null;
  consumeByDate: string;
  locationCategory: string;  
}

export interface OcrInventoryUpdatePayload {
  items: OcrInventoryCreatePayload[];
}

export async function addOcrIngredients(fridgeId: number, payload: OcrInventoryUpdatePayload) {
  const response = await apiClient.post(`/api/inventories/${fridgeId}/ocr`, payload);
  return response.data;
  
}

export async function getInventories(fridgeId: number, keyword?: string) {
  const response = await apiClient.get<InventoryItem[]>("/api/inventories", {
    params: { fridgeId, keyword: keyword?.trim() || undefined },
  });
  return response.data;
}

export async function getInventory(batchId: string | number) {
  const response = await apiClient.get<InventoryItem>(
    `/api/inventories/${batchId}`,
  );
  return response.data;
}

export async function createInventory(payload: InventoryCreatePayload) {
  const response = await apiClient.post<InventoryItem>(
    "/api/inventories",
    payload,
  );
  return response.data;
}

export async function updateInventory(
  batchId: string | number,
  payload: InventoryUpdatePayload,
) {
  const response = await apiClient.patch<InventoryItem>(
    `/api/inventories/${batchId}`,
    payload,
  );
  return response.data;
}

export async function deleteInventory(batchId: string | number, reason: "CONSUMED" | "DISCARDED") {
  await apiClient.delete(`/api/inventories/${batchId}`, { params: { reason } });
}

