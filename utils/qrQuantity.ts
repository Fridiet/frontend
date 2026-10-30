import type { UnitType } from "../types/fridge";

type QrDeductPayload = {
  unitType: UnitType;
  quantityUsed?: number;
  customText?: string;
};

type PreparedQrDeduction = {
  error: string | null;
  payload: QrDeductPayload | null;
  quantityUsed: number | null;
  nextRemaining: number | null;
  customText: string | null;
};

export function calculateQrUsage(remaining: number | null, value: string, mode: "used" | "remaining") {
  if (remaining === null || !Number.isFinite(remaining) || remaining < 0) return { error: "현재 잔량을 확인할 수 없어요. 다시 스캔해 주세요." };
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return { error: "양을 0 이상의 숫자로 입력해 주세요." };
  const input = Number(value);
  if (!Number.isFinite(input) || input > remaining) return { error: "현재 잔량보다 큰 양은 입력할 수 없어요." };
  const quantityUsed = Number((mode === "remaining" ? remaining - input : input).toFixed(10));
  if (quantityUsed <= 0) return { error: "사용량이 0보다 커야 해요. 남은 양을 확인해 주세요." };
  return { quantityUsed, nextRemaining: Number((remaining - quantityUsed).toFixed(10)) };
}

export function prepareQrDeduction(
  unitType: UnitType | null,
  remaining: number | null,
  value: string,
  mode: "used" | "remaining",
): PreparedQrDeduction {
  if (!unitType) {
    return {
      error: "재고 수량 방식을 확인할 수 없어요.",
      payload: null,
      quantityUsed: null,
      nextRemaining: null,
      customText: null,
    };
  }

  if (unitType === "CUSTOM") {
    const customText = value.trim();
    if (!customText) {
      return {
        error: "사용 후 남은 상태를 입력해 주세요.",
        payload: null,
        quantityUsed: null,
        nextRemaining: null,
        customText: null,
      };
    }
    return {
      error: null,
      payload: { unitType, customText },
      quantityUsed: null,
      nextRemaining: null,
      customText,
    };
  }

  const usage = calculateQrUsage(remaining, value, mode);
  if (usage.error || usage.quantityUsed == null || usage.nextRemaining == null) {
    return {
      error: usage.error ?? "사용량을 확인해 주세요.",
      payload: null,
      quantityUsed: null,
      nextRemaining: null,
      customText: null,
    };
  }
  return {
    error: null,
    payload: { unitType, quantityUsed: usage.quantityUsed },
    quantityUsed: usage.quantityUsed,
    nextRemaining: usage.nextRemaining,
    customText: null,
  };
}
