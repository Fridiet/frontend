import apiClient from "./client";

export type CartItemResponse = {
  itemId: number;
  ingredientMasterId: number | null;
  itemName: string;
  category?: string | null;
  iconName?: string | null;
  unitType: "QUANTITY" | "PERCENT" | "CUSTOM";
  quantity: number | null;
  customQuantityText: string | null;
  unit: string | null;
  state: "NEEDED" | "BOUGHT" | "REMOVED";
  memo: string | null;
  sourceType: "MANUAL" | "RECIPE" | "LOW_STOCK" | "EXPIRY" | string;
  sourceRefId: number | null;
  createdByUserId: number;
  boughtByUserId: number | null;
};

export type CartResponse = {
  cartId: number;
  fridgeId: number;
  ownerUserId: number;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  items: CartItemResponse[];
  createdAt: string;
};

export type AddCartItemPayload = {
  itemName: string;
  unitType?: "QUANTITY" | "PERCENT" | "CUSTOM";
  quantity?: number;
  customQuantityText?: string;
  unit?: string;
  memo?: string;
  sourceType?: "MANUAL" | "RECIPE" | "LOW_STOCK" | "EXPIRY";
  sourceRefId?: number;
};

export async function getActiveCarts(fridgeId: number) {
  const response = await apiClient.get<CartResponse[]>("/api/carts", {
    params: { fridgeId },
  });
  return response.data;
}

export async function createCart(fridgeId: number, name: string) {
  const response = await apiClient.post<CartResponse>("/api/carts", {
    fridgeId,
    name,
  });
  return response.data;
}

export async function addCartItem(
  cartId: number,
  payload: AddCartItemPayload,
) {
  const response = await apiClient.post<CartItemResponse>(
    `/api/carts/${cartId}/items`,
    payload,
  );
  return response.data;
}

export async function removeCartItem(itemId: number) {
  const response = await apiClient.patch<CartItemResponse>(
    `/api/carts/items/${itemId}/state`,
    { state: "REMOVED" },
  );
  return response.data;
}

export type BuyCartItemPayload = {
  countBasis?: string | null;
  perCountQuantity?: number | null;
  perCountUnit?: string | null;
  quantityNeedsReview?: boolean;
  expirationDate: string;
  locationCategory: "REFRIGERATED" | "FROZEN" | "ROOM_TEMP";
  unitType: "QUANTITY" | "PERCENT" | "CUSTOM";
  quantity?: number;
  unit?: string;
  customQuantityText?: string;
};

export async function buyCartItem(itemId: number, payload: BuyCartItemPayload) {
  const response = await apiClient.post<number>(`/api/carts/items/${itemId}/buy`, payload);
  return response.data;
}

export async function getOrCreateActiveCart(
  fridgeId: number,
  defaultName = "기본 장바구니",
) {
  const carts = await getActiveCarts(fridgeId);
  return carts[0] ?? createCart(fridgeId, defaultName);
}
