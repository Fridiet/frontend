import { getToken } from "../utils/token";

export type ReceiptDraftItem = {
  requiresManualEntry?: boolean;
  rawText?: string;
  reviewNotes?: string[];
  id: string;
  name: string;
  quantity: string;
  unit: string;
  consumeByDate: string;
  locationCategory: string;
  category: string;
};

type UploadAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
};

function normalizeStorage(value: unknown) {
  const normalized = String(value ?? "UNKNOWN").toUpperCase();
  if (normalized === "ROOM_TEMPERATURE" || normalized === "ROOM_TEMP") {
    return "ROOM_TEMP";
  }
  if (normalized === "FROZEN") return "FROZEN";
  if (normalized === "SEASONING") return "SEASONING";
  if (normalized === "REFRIGERATED") return "REFRIGERATED";
  return "UNKNOWN";
}

function mapSimpleItems(data: Record<string, unknown>) {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  return rawItems.map((raw, index): ReceiptDraftItem => {
    const item = raw as Record<string, unknown>;
    return {
      id: `receipt-${index}`,
      rawText: typeof item.rawText === "string" ? item.rawText : undefined,
      reviewNotes: Array.isArray(item.reviewNotes) ? item.reviewNotes.map(String) : [],
      name: String(item.name ?? ""),
      quantity: String(item.quantity ?? 1),
      unit: String(item.unit ?? "개"),
      consumeByDate: String(item.consumeByDate ?? ""),
      locationCategory: normalizeStorage(item.locationCategory),
      category: String(item.category ?? "etc"),
    };
  });
}

function mapOcrTextItems(data: Record<string, unknown>) {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  return rawItems
    .map((raw, index): ReceiptDraftItem | null => {
      const item = raw as Record<string, unknown>;
      const name = String(item.text ?? "").trim();
      if (!name) return null;

      return {
        id: `ocr-${index}`,
        name,
        quantity: "1",
        unit: "개",
        consumeByDate: "",
        locationCategory: "REFRIGERATED",
        category: "etc",
      };
    })
    .filter((item): item is ReceiptDraftItem => item !== null);
}

function mapCandidateItems(data: Record<string, unknown>) {
  const rawItems = Array.isArray(data.inventory_candidates)
    ? data.inventory_candidates
    : [];

  return rawItems.map((raw, index): ReceiptDraftItem => {
    const candidate = raw as Record<string, unknown>;
    const master = (candidate.ingredient_master_candidate ?? {}) as Record<
      string,
      unknown
    >;
    const batch = (candidate.inventory_batch_candidate ?? {}) as Record<
      string,
      unknown
    >;

    return {
      id: `candidate-${String(candidate.row_index ?? index)}`,
      name: String(master.canonical_name ?? candidate.normalized_product_name ?? ""),
      quantity: String(batch.remaining_quantity ?? 1),
      unit: String(batch.unit ?? master.default_unit ?? "개"),
      consumeByDate: String(batch.consume_by_date ?? ""),
      locationCategory: normalizeStorage(batch.storage_type),
      category: String(master.ingredient_type ?? "etc").toLowerCase(),
    };
  });
}

async function upload(path: string, asset: UploadAsset) {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("백엔드 서버 주소가 설정되지 않았습니다.");
  }
  const token = await getToken();
  if (!token) throw new Error("로그인 후 영수증을 등록해주세요.");

  const formData = new FormData();
  if (asset.uri.startsWith("blob:")) {
    const assetResponse = await fetch(asset.uri);
    if (!assetResponse.ok) {
      throw new Error("선택한 영수증 이미지를 불러오지 못했습니다.");
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

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("로그인이 만료되었습니다. 다시 로그인해주세요.");
    }
    if (response.status === 413) throw new Error("이미지는 10MB 이하로 보내주세요.");
    const message = await response.text();
    const error = new Error(message || `OCR 요청 실패 (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }

  return (await response.json()) as Record<string, unknown>;
}

export async function analyzeReceipt(asset: UploadAsset) {
  const data = await upload("/api/ocr/receipt", asset);

  if (Array.isArray(data.inventory_candidates)) {
    return mapCandidateItems(data);
  }

  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.some((raw) => "text" in (raw as Record<string, unknown>))) {
    return mapOcrTextItems(data);
  }

  const review = Array.isArray(data.reviewCandidates) ? data.reviewCandidates : [];
  return [...mapSimpleItems(data), ...review.map((raw, index): ReceiptDraftItem => {
    const row = raw as Record<string, unknown>;
    return {id: `review-${index}`, name: "", quantity: String(row.purchaseCount ?? 1), unit: "",
      consumeByDate: "", locationCategory: "UNKNOWN", category: "etc", requiresManualEntry: true,
      rawText: String(row.rawText ?? ""), reviewNotes: [String(row.reason ?? "직접 확인이 필요합니다."), "구매 개수와 재고 단위를 확인해주세요."]};
  })];
}
