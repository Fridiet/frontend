import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  createFridge as createFridgeRequest,
  createInviteCode as createInviteCodeRequest,
  getMyFridges,
  joinFridge as joinFridgeRequest,
  setMainFridge as setMainFridgeRequest,
} from "../api/fridgeApi";
import type { FridgeSummary } from "../types/fridge";
import { getApiErrorMessage } from "../utils/apiError";

// Device-wide legacy preferences cannot be safely assigned to a particular account.
const SELECTED_FRIDGE_KEY = "selected_fridge_id:v2";
const FRIDGE_PREFERENCES_KEY = "fridiet:fridge-preferences:v2";
const DEFAULT_FRIDGE_NAME = "우리집 냉장고";

type FridgePreferences = {
  aliases: Record<string, string>;
  hiddenIds: number[];
};

type FridgeContextValue = {
  fridges: FridgeSummary[];
  removedFridges: FridgeSummary[];
  currentFridge: FridgeSummary | null;
  loading: boolean;
  error: string | null;
  refreshFridges: () => Promise<void>;
  selectFridge: (fridgeId: number) => Promise<void>;
  setMainFridge: (fridgeId: number) => Promise<void>;
  renameFridge: (fridgeId: number, name: string) => Promise<void>;
  removeFridge: (fridgeId: number) => Promise<void>;
  restoreFridge: (fridgeId: number) => Promise<void>;
  createFridge: (name: string) => Promise<void>;
  joinFridge: (inviteCode: string) => Promise<void>;
  createInviteCode: () => Promise<string>;
};

type FridgeProviderProps = PropsWithChildren<{
  enabled?: boolean;
  userId?: string | number | null;
}>;

const FridgeContext = createContext<FridgeContextValue | null>(null);

const emptyPreferences: FridgePreferences = { aliases: {}, hiddenIds: [] };

function applyPreferences(
  fridges: FridgeSummary[],
  preferences: FridgePreferences,
  hidden: boolean,
) {
  const hiddenIds = new Set(preferences.hiddenIds);
  return fridges
    .filter((fridge) => hiddenIds.has(fridge.fridgeId) === hidden)
    .map((fridge) => ({
      ...fridge,
      fridgeName:
        preferences.aliases[String(fridge.fridgeId)]?.trim() ||
        fridge.fridgeName,
    }));
}

async function loadFridgePreferences(userId: string): Promise<FridgePreferences> {
  try {
    const raw = await AsyncStorage.getItem(`${FRIDGE_PREFERENCES_KEY}:${userId}`);
    if (!raw) return emptyPreferences;
    const parsed = JSON.parse(raw) as Partial<FridgePreferences>;
    return {
      aliases:
        parsed.aliases && typeof parsed.aliases === "object"
          ? parsed.aliases
          : {},
      hiddenIds: Array.isArray(parsed.hiddenIds)
        ? parsed.hiddenIds.filter((id): id is number => Number.isFinite(id))
        : [],
    };
  } catch {
    return emptyPreferences;
  }
}

async function saveFridgePreferences(preferences: FridgePreferences, userId: string | null) {
  if (!userId) throw new Error("로그인 정보를 확인해 주세요.");
  await AsyncStorage.setItem(
    `${FRIDGE_PREFERENCES_KEY}:${userId}`,
    JSON.stringify(preferences),
  );
}

function pickFridge(
  fridges: FridgeSummary[],
  savedFridgeId: number | null,
  preferMain: boolean,
) {
  return (
    (preferMain ? fridges.find((fridge) => fridge.isMain) : null) ??
    fridges.find((fridge) => fridge.fridgeId === savedFridgeId) ??
    fridges.find((fridge) => fridge.isMain) ??
    fridges[0] ??
    null
  );
}

export function FridgeProvider({
  children,
  enabled = true,
  userId,
}: FridgeProviderProps) {
  const accountId = userId == null ? null : String(userId);
  const selectedFridgeKey = `${SELECTED_FRIDGE_KEY}:${accountId ?? "guest"}`;
  const requestVersion = useRef(0);
  const [fridges, setFridges] = useState<FridgeSummary[]>([]);
  const [serverFridges, setServerFridges] = useState<FridgeSummary[]>([]);
  const [preferences, setPreferences] =
    useState<FridgePreferences>(emptyPreferences);
  const [currentFridge, setCurrentFridge] = useState<FridgeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootstrappingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadFridges = useCallback(async (allowDefaultCreation: boolean) => {
    if (!enabled || !accountId) return;
    const version = requestVersion.current;
    const current = () => version === requestVersion.current;
    let nextFridges = await getMyFridges();
    if (!current()) return;

    if (allowDefaultCreation && nextFridges.length === 0) {
      // 응답 유실 뒤 재시도하는 경우를 대비해 생성 직전에 한 번 더 확인한다.
      nextFridges = await getMyFridges();
      if (!current()) return;

      if (nextFridges.length === 0) {
        try {
          await createFridgeRequest(DEFAULT_FRIDGE_NAME);
          if (!current()) return;
        } catch (createError) {
          if (!current()) return;
          // 백엔드가 저장 후 응답 직렬화에 실패해도 목록에 생성됐을 수 있다.
          const recoveredFridges = await getMyFridges();
          if (!current()) return;
          if (recoveredFridges.length === 0) {
            throw createError;
          }
          nextFridges = recoveredFridges;
        }

        if (nextFridges.length === 0) {
          nextFridges = await getMyFridges();
          if (!current()) return;
        }
      }
    }

    const nextPreferences = await loadFridgePreferences(accountId);
    if (!current()) return;
    const visibleFridges = applyPreferences(
      nextFridges,
      nextPreferences,
      false,
    );
    const savedValue = await AsyncStorage.getItem(selectedFridgeKey);
    if (!current()) return;
    const savedFridgeId = savedValue ? Number(savedValue) : null;
    const selected = pickFridge(
      visibleFridges,
      Number.isFinite(savedFridgeId) ? savedFridgeId : null,
      !hasLoadedRef.current,
    );

    setServerFridges(nextFridges);
    setPreferences(nextPreferences);
    setFridges(visibleFridges);
    setCurrentFridge(selected);
    hasLoadedRef.current = true;

    if (selected) {
      await AsyncStorage.setItem(
        selectedFridgeKey,
        String(selected.fridgeId),
      );
    }
  }, [accountId, enabled, selectedFridgeKey]);

  const refreshFridges = useCallback(async () => {
    if (!enabled || !accountId || bootstrappingRef.current) return;
    const version = requestVersion.current;

    bootstrappingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      await loadFridges(true);
    } catch (refreshError) {
      if (version !== requestVersion.current) return;
      setError(
        getApiErrorMessage(
          refreshError,
          "냉장고 정보를 불러오지 못했습니다.",
        ),
      );
    } finally {
      if (version === requestVersion.current) {
        bootstrappingRef.current = false;
        setLoading(false);
      }
    }
  }, [accountId, enabled, loadFridges]);

  useEffect(() => {
    requestVersion.current += 1;
    bootstrappingRef.current = false;
    setFridges([]);
    setServerFridges([]);
    setPreferences(emptyPreferences);
    setCurrentFridge(null);
    setError(null);
    hasLoadedRef.current = false;
    if (!enabled || !accountId) {
      setLoading(false);
    } else {
      void refreshFridges();
    }
    return () => { requestVersion.current += 1; };
  }, [accountId, enabled, refreshFridges]);

  const selectFridge = useCallback(
    async (fridgeId: number) => {
      const selected = fridges.find((fridge) => fridge.fridgeId === fridgeId);
      if (!selected) return;

      setCurrentFridge(selected);
      await AsyncStorage.setItem(selectedFridgeKey, String(fridgeId));
    },
    [fridges, selectedFridgeKey],
  );

  const setMainFridge = useCallback(
    async (fridgeId: number) => {
      const version = requestVersion.current;
      const target = fridges.find((fridge) => fridge.fridgeId === fridgeId);
      if (!target) {
        throw new Error("대표로 설정할 냉장고를 찾지 못했습니다.");
      }

      await setMainFridgeRequest(fridgeId);
      if (version !== requestVersion.current) return;
      const nextServerFridges = (await getMyFridges()).map((fridge) => ({
        ...fridge,
        isMain: fridge.fridgeId === fridgeId,
      }));
      if (version !== requestVersion.current) return;
      const nextFridges = applyPreferences(
        nextServerFridges,
        preferences,
        false,
      );
      const selectedId = currentFridge?.fridgeId;
      setServerFridges(nextServerFridges);
      setFridges(nextFridges);
      setCurrentFridge(
        nextFridges.find((fridge) => fridge.fridgeId === selectedId) ??
          nextFridges.find((fridge) => fridge.isMain) ??
          nextFridges[0] ??
          null,
      );
    },
    [currentFridge?.fridgeId, fridges, preferences],
  );

  const renameFridge = useCallback(
    async (fridgeId: number, name: string) => {
      const version = requestVersion.current;
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("냉장고 이름을 입력해 주세요.");
      }
      if (!serverFridges.some((fridge) => fridge.fridgeId === fridgeId)) {
        throw new Error("이름을 바꿀 냉장고를 찾지 못했습니다.");
      }

      const nextPreferences = {
        ...preferences,
        aliases: {
          ...preferences.aliases,
          [String(fridgeId)]: trimmedName,
        },
      };
      await saveFridgePreferences(nextPreferences, accountId);
      if (version !== requestVersion.current) return;
      const nextFridges = applyPreferences(
        serverFridges,
        nextPreferences,
        false,
      );
      setPreferences(nextPreferences);
      setFridges(nextFridges);
      setCurrentFridge((current) =>
        current?.fridgeId === fridgeId
          ? nextFridges.find((fridge) => fridge.fridgeId === fridgeId) ?? current
          : current,
      );
    },
    [accountId, preferences, serverFridges],
  );

  const removeFridge = useCallback(
    async (fridgeId: number) => {
      const version = requestVersion.current;
      const target = fridges.find((fridge) => fridge.fridgeId === fridgeId);
      if (!target) throw new Error("제거할 냉장고를 찾지 못했습니다.");
      if (target.isMain) {
        throw new Error("대표 냉장고는 다른 냉장고를 대표로 설정한 뒤 제거해 주세요.");
      }

      const nextPreferences = {
        ...preferences,
        hiddenIds: Array.from(new Set([...preferences.hiddenIds, fridgeId])),
      };
      await saveFridgePreferences(nextPreferences, accountId);
      if (version !== requestVersion.current) return;
      const nextFridges = applyPreferences(
        serverFridges,
        nextPreferences,
        false,
      );
      const nextCurrent =
        currentFridge?.fridgeId === fridgeId
          ? nextFridges.find((fridge) => fridge.isMain) ?? nextFridges[0] ?? null
          : currentFridge;

      setPreferences(nextPreferences);
      setFridges(nextFridges);
      setCurrentFridge(nextCurrent);
      if (nextCurrent) {
        await AsyncStorage.setItem(
          selectedFridgeKey,
          String(nextCurrent.fridgeId),
        );
      } else {
        await AsyncStorage.removeItem(selectedFridgeKey);
      }
    },
    [accountId, currentFridge, fridges, preferences, selectedFridgeKey, serverFridges],
  );

  const restoreFridge = useCallback(
    async (fridgeId: number) => {
      const version = requestVersion.current;
      const nextPreferences = {
        ...preferences,
        hiddenIds: preferences.hiddenIds.filter((id) => id !== fridgeId),
      };
      await saveFridgePreferences(nextPreferences, accountId);
      if (version !== requestVersion.current) return;
      setPreferences(nextPreferences);
      setFridges(applyPreferences(serverFridges, nextPreferences, false));
    },
    [accountId, preferences, serverFridges],
  );

  const createFridge = useCallback(
    async (name: string) => {
      const version = requestVersion.current;
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("냉장고 이름을 입력해 주세요.");
      }

      const previousIds = new Set(fridges.map((fridge) => fridge.fridgeId));
      try {
        await createFridgeRequest(trimmedName);
      } catch (createError) {
        if (version !== requestVersion.current) return;
        const recovered = await getMyFridges();
        if (version !== requestVersion.current) return;
        if (!recovered.some((fridge) => !previousIds.has(fridge.fridgeId))) {
          throw createError;
        }
      }
      if (version !== requestVersion.current) return;
      const nextFridges = await getMyFridges();
      if (version !== requestVersion.current) return;
      setServerFridges(nextFridges);
      const visibleFridges = applyPreferences(
        nextFridges,
        preferences,
        false,
      );
      const newest =
        visibleFridges.find((fridge) => !previousIds.has(fridge.fridgeId)) ??
        visibleFridges[0] ??
        null;
      setFridges(visibleFridges);
      setCurrentFridge(newest);

      if (newest) {
        await AsyncStorage.setItem(
          selectedFridgeKey,
          String(newest.fridgeId),
        );
      }
    },
    [fridges, preferences, selectedFridgeKey],
  );

  const joinFridge = useCallback(
    async (inviteCode: string) => {
      const version = requestVersion.current;
      const normalizedCode = inviteCode.trim().toUpperCase();
      if (!normalizedCode) {
        throw new Error("초대 코드를 입력해 주세요.");
      }

      const previousIds = new Set(fridges.map((fridge) => fridge.fridgeId));
      await joinFridgeRequest(normalizedCode);
      if (version !== requestVersion.current) return;
      const nextFridges = await getMyFridges();
      if (version !== requestVersion.current) return;
      setServerFridges(nextFridges);
      const visibleFridges = applyPreferences(
        nextFridges,
        preferences,
        false,
      );
      const joined =
        visibleFridges.find((fridge) => !previousIds.has(fridge.fridgeId)) ??
        visibleFridges[0] ??
        null;
      setFridges(visibleFridges);
      setCurrentFridge(joined);

      if (joined) {
        await AsyncStorage.setItem(
          selectedFridgeKey,
          String(joined.fridgeId),
        );
      }
    },
    [fridges, preferences, selectedFridgeKey],
  );

  const createInviteCode = useCallback(async () => {
    if (!currentFridge) {
      throw new Error("선택된 냉장고가 없습니다.");
    }
    return createInviteCodeRequest(currentFridge.fridgeId);
  }, [currentFridge]);

  const value = useMemo<FridgeContextValue>(
    () => ({
      fridges,
      removedFridges: applyPreferences(serverFridges, preferences, true),
      currentFridge,
      loading,
      error,
      refreshFridges,
      selectFridge,
      setMainFridge,
      renameFridge,
      removeFridge,
      restoreFridge,
      createFridge,
      joinFridge,
      createInviteCode,
    }),
    [
      fridges,
      serverFridges,
      preferences,
      currentFridge,
      loading,
      error,
      refreshFridges,
      selectFridge,
      setMainFridge,
      renameFridge,
      removeFridge,
      restoreFridge,
      createFridge,
      joinFridge,
      createInviteCode,
    ],
  );

  return (
    <FridgeContext.Provider value={value}>{children}</FridgeContext.Provider>
  );
}

export function useFridge() {
  const context = useContext(FridgeContext);
  if (!context) {
    throw new Error("useFridge must be used within FridgeProvider");
  }
  return context;
}
