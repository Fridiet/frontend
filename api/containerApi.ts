import apiClient from "./client";
import type { UnitType } from "../types/fridge";
import { Platform } from "react-native";
import type { ImagePickerAsset } from "expo-image-picker";

export type ContainerEstimate = {
  remainingBand: "empty" | "up_to_25" | "up_to_50" | "up_to_75" | "over_75" | "unknown";
  status: "estimated" | "unable_to_estimate";
  remainingPercent: number | null;
  lowerPercent: number | null;
  upperPercent: number | null;
  reason: string;
  requiresConfirmation: boolean;
  basis: "container_volume";
};

export async function estimateContainer(qrCodeToken: string, asset: ImagePickerAsset) {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(asset.uri)).blob();
    form.append("file", blob, asset.fileName || "container.jpg");
  } else {
    form.append("file", { uri: asset.uri, name: asset.fileName || "container.jpg",
      type: asset.mimeType || "image/jpeg" } as unknown as Blob);
  }
  const response = await apiClient.post<ContainerEstimate>("/api/containers/estimate", form, {
    params: { qrCodeToken }, timeout: 70000,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export type ContainerScanResponse = {
  quantityNeedsReview?: boolean;
  countBasis?: string | null;
  containerId: number | null;
  qrCodeToken: string;
  containerName: string;
  isEmpty: boolean;
  batchId: number | null;
  ingredientName: string | null;
  unitType: UnitType | null;
  remainingQuantity: number | null;
  customQuantityText: string | null;
  unit: string | null;
  consumeByDate: string | null;
};

export type ContainerRegisterPayload = {
  countBasis?: string | null;
  perCountQuantity?: number | null;
  perCountUnit?: string | null;
  quantityNeedsReview?: boolean;
  qrCodeToken: string;
  fridgeId: number;
  containerName?: string;
  existingBatchId?: number;
  ingredientName?: string;
  unitType?: UnitType;
  remainingQuantity?: number | null;
  customQuantityText?: string | null;
  unit?: string | null;
  consumeByDate?: string;
  locationCategory?: "REFRIGERATED" | "FROZEN" | "ROOM_TEMPERATURE" | "SEASONING";
};

export type ContainerSplitPayload = {
  qrCodeToken: string;
  fridgeId: number;
  sourceBatchId: number;
  transferredQuantity: number | null;
  sourceRemainingQuantity?: number | null;
  transferredText?: string | null;
  sourceRemainingText?: string | null;
  sourceUnit: string | null;
  containerUnit?: string | null;
  containerUnitType: UnitType;
  containerRemainingQuantity: number | null;
  containerRemainingText?: string | null;
  containerName: string;
};

export type ContainerDeductPayload = {
  unitType: UnitType;
  quantityUsed?: number;
  customText?: string;
};

export async function generateContainerQr(token: string, signal?: AbortSignal) {
  const response = await apiClient.get<ArrayBuffer>("/api/containers/qr/generate", {
    params: { token },
    responseType: "arraybuffer",
    headers: { Accept: "image/png" },
    timeout: 20000,
    signal,
  });
  const bytes = new Uint8Array(response.data);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) {
    throw new Error("QR 이미지가 아닌 응답을 받았어요. 백엔드 주소를 확인해 주세요.");
  }
  return bytes;
}

export async function scanContainer(qrCodeToken: string) {
  const response = await apiClient.get<ContainerScanResponse>("/api/containers/scan", {
    params: { qrCodeToken },
    timeout: 20000,
  });
  return response.data;
}

export async function registerContainer(payload: ContainerRegisterPayload) {
  const response = await apiClient.post<ContainerScanResponse>(
    "/api/containers/register",
    payload,
    { timeout: 20000 },
  );
  return response.data;
}

export async function registerContainerWithSplit(payload: ContainerSplitPayload) {
  const response = await apiClient.post<ContainerScanResponse>(
    "/api/containers/register-with-split",
    payload,
    { timeout: 20000 },
  );
  return response.data;
}

export async function deductContainer(
  qrCodeToken: string,
  payload: ContainerDeductPayload,
) {
  const response = await apiClient.post<ContainerScanResponse>(
    "/api/containers/deduct",
    payload,
    { params: { qrCodeToken } },
  );
  return response.data;
}

