import apiClient from "./client";

import type { FridgeSummary } from "../types/fridge";

export async function getMyFridges() {
  const response = await apiClient.get<FridgeSummary[]>("/api/fridges/my");
  return response.data;
}

export async function createFridge(name: string) {
  await apiClient.post("/api/fridges", { name });
}

export async function joinFridge(inviteCode: string) {
  await apiClient.post("/api/fridges/join", { inviteCode });
}

export async function createInviteCode(fridgeId: number) {
  const response = await apiClient.post<{ inviteCode: string }>(
    `/api/fridges/${fridgeId}/code`,
  );
  return response.data.inviteCode;
}

export async function setMainFridge(fridgeId: number) {
  await apiClient.patch("/api/fridges/main", undefined, {
    params: { targetFridgeId: fridgeId },
  });
}

