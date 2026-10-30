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

const SELECTED_FRIDGE_KEY = "selected_fridge_id";
const FRIDGE_PREFERENCES_KEY = "fridiet:fridge-preferences:v1";
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

async function loadFridgePreferences(): Promise<FridgePreferences> {
  try {
    const raw = await AsyncStorage.getItem(FRIDGE_PREFERENCES_KEY);
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

async function saveFridgePreferences(preferences: FridgePreferences) {
  await AsyncStorage.setItem(
    FRIDGE_PREFERENCES_KEY,
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
}: FridgeProviderProps) {
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
    let nextFridges = await getMyFridges();

    if (allowDefaultCreation && nextFridges.length === 0) {
      // 응답 유실 뒤 재시도하는 경우를 대비해 생성 직전에 한 번 더 확인한다.
      nextFridges = await getMyFridges();

      if (nextFridges.length === 0) {
        try {
          await createFridgeRequest(DEFAULT_FRIDGE_NAME);
        } catch (createError) {
          // 백엔드가 저장 후 응답 직렬화에 실패해도 목록에 생성됐을 수 있다.
          const recoveredFridges = await getMyFridges();
          if (recoveredFridges.length === 0) {
            throw createError;
          }
          nextFridges = recoveredFridges;
        }

        if (nextFridges.length === 0) {
          nextFridges = await getMyFridges();
        }
      }
    }

    const nextPreferences = await loadFridgePreferences();
    const visibleFridges = applyPreferences(
      nextFridges,
      nextPreferences,
      false,
    );
    const savedValue = await AsyncStorage.getItem(SELECTED_FRIDGE_KEY);
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
        SELECTED_FRIDGE_KEY,
        String(selected.fridgeId),
      );
    }
  }, []);

  const refreshFridges = useCallback(async () => {
    if (bootstrappingRef.current) return;

    bootstrappingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      await loadFridges(true);
    } catch (refreshError) {
      setError(
        getApiErrorMessage(
          refreshError,
          "냉장고 정보를 불러오지 못했습니다.",
        ),
      );
    } finally {
      bootstrappingRef.current = false;
      setLoading(false);
    }
  }, [loadFridges]);

  useEffect(() => {
    if (!enabled) {
      setFridges([]);
      setServerFridges([]);
      setPreferences(emptyPreferences);
      setCurrentFridge(null);
      setError(null);
      setLoading(false);
      hasLoadedRef.current = false;
      void AsyncStorage.removeItem(SELECTED_FRIDGE_KEY);
      return;
    }

    void refreshFridges();
  }, [enabled, refreshFridges]);

  const selectFridge = useCallback(
    async (fridgeId: number) => {
      const selected = fridges.find((fridge) => fridge.fridgeId === fridgeId);
      if (!selected) return;

      setCurrentFridge(selected);
      await AsyncStorage.setItem(SELECTED_FRIDGE_KEY, String(fridgeId));
    },
    [fridges],
  );

  const setMainFridge = useCallback(
    async (fridgeId: number) => {
      const target = fridges.find((fridge) => fridge.fridgeId === fridgeId);
      if (!target) {
        throw new Error("대표로 설정할 냉장고를 찾지 못했습니다.");
      }

      await setMainFridgeRequest(fridgeId);
      const nextServerFridges = (await getMyFridges()).map((fridge) => ({
        ...fridge,
        isMain: fridge.fridgeId === fridgeId,
      }));
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
      await saveFridgePreferences(nextPreferences);
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
    [preferences, serverFridges],
  );

  const removeFridge = useCallback(
    async (fridgeId: number) => {
      const target = fridges.find((fridge) => fridge.fridgeId === fridgeId);
      if (!target) throw new Error("제거할 냉장고를 찾지 못했습니다.");
      if (target.isMain) {
        throw new Error("대표 냉장고는 다른 냉장고를 대표로 설정한 뒤 제거해 주세요.");
      }

      const nextPreferences = {
        ...preferences,
        hiddenIds: Array.from(new Set([...preferences.hiddenIds, fridgeId])),
      };
      await saveFridgePreferences(nextPreferences);
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
          SELECTED_FRIDGE_KEY,
          String(nextCurrent.fridgeId),
        );
      } else {
        await AsyncStorage.removeItem(SELECTED_FRIDGE_KEY);
      }
    },
    [currentFridge, fridges, preferences, serverFridges],
  );

  const restoreFridge = useCallback(
    async (fridgeId: number) => {
      const nextPreferences = {
        ...preferences,
        hiddenIds: preferences.hiddenIds.filter((id) => id !== fridgeId),
      };
      await saveFridgePreferences(nextPreferences);
      setPreferences(nextPreferences);
      setFridges(applyPreferences(serverFridges, nextPreferences, false));
    },
    [preferences, serverFridges],
  );

  const createFridge = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("냉장고 이름을 입력해 주세요.");
      }

      const previousIds = new Set(fridges.map((fridge) => fridge.fridgeId));
      try {
        await createFridgeRequest(trimmedName);
      } catch (createError) {
        const recovered = await getMyFridges();
        if (!recovered.some((fridge) => !previousIds.has(fridge.fridgeId))) {
          throw createError;
        }
      }
      const nextFridges = await getMyFridges();
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
          SELECTED_FRIDGE_KEY,
          String(newest.fridgeId),
        );
      }
    },
    [fridges, preferences],
  );

  const joinFridge = useCallback(
    async (inviteCode: string) => {
      const normalizedCode = inviteCode.trim().toUpperCase();
      if (!normalizedCode) {
        throw new Error("초대 코드를 입력해 주세요.");
      }

      const previousIds = new Set(fridges.map((fridge) => fridge.fridgeId));
      await joinFridgeRequest(normalizedCode);
      const nextFridges = await getMyFridges();
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
          SELECTED_FRIDGE_KEY,
          String(joined.fridgeId),
        );
      }
    },
    [fridges, preferences],
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
