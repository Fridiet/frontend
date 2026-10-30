import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { registerContainer, scanContainer, type ContainerScanResponse } from "../api/containerApi";
import { getInventories } from "../api/inventoryApi";
import type { FridgeSummary, InventoryItem } from "../types/fridge";
import { getApiErrorMessage } from "../utils/apiError";
import { isUsableInventory } from "../utils/inventoryAvailability";

export function useQrRegistration(
  token: string | null,
  fridge: FridgeSummary | null,
  operationLock: RefObject<boolean>,
) {
  const fridgeId = fridge?.fridgeId ?? null;
  const scope = useMemo(() => ({ active: false }), [token, fridgeId]);
  const mounted = useRef(false);
  const [containerName, setContainerName] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [inventoryState, setInventoryState] = useState<{
    fridgeId: number | null; items: InventoryItem[]; loading: boolean; error: string | null;
  }>({ fridgeId: null, items: [], loading: false, error: null });
  const [inventoryAttempt, setInventoryAttempt] = useState(0);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<ContainerScanResponse | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    scope.active = true;
    setSelectedBatchId(null);
    setError(null);
    return () => { scope.active = false; };
  }, [scope]);

  useEffect(() => {
    setContainerName("");
    setRegistered(null);
  }, [token]);

  useEffect(() => {
    let active = true;
    setSelectedBatchId(null);
    setInventoryState({ fridgeId, items: [], loading: fridgeId !== null, error: null });
    if (fridgeId !== null) {
      void getInventories(fridgeId).then((items) => {
        if (active) setInventoryState({
          fridgeId,
          items: items.filter((item) => item.fridgeId === fridgeId && isUsableInventory(item)),
          loading: false, error: null,
        });
      }).catch((loadError: unknown) => {
        if (active) setInventoryState({ fridgeId, items: [], loading: false,
          error: getApiErrorMessage(loadError, "재료 목록을 불러오지 못했어요. 다시 시도해 주세요."),
        });
      });
    }
    return () => { active = false; };
  }, [fridgeId, inventoryAttempt]);

  const inventoryCurrent = inventoryState.fridgeId === fridgeId;
  const inventories = inventoryCurrent ? inventoryState.items : [];
  const inventoryLoading = !inventoryCurrent || inventoryState.loading;
  const inventoryError = inventoryCurrent ? inventoryState.error : null;
  const container = registered?.qrCodeToken === token ? registered : null;
  const selectedInventory = inventories.find((item) => item.batchId === selectedBatchId) ?? null;

  const connect = async () => {
    if (!scope.active || !token || fridgeId === null || !selectedInventory || container || operationLock.current) return;
    operationLock.current = true;
    setRegistering(true);
    setError(null);
    try {
      // A previous response may have been lost, including while switching fridges.
      // Never overwrite an already registered token or pretend its name was edited.
      const existing = await scanContainer(token);
      if (!scope.active) return;
      if (existing.containerId !== null) {
        setRegistered(existing);
        return;
      }
      try {
        const result = await registerContainer({ qrCodeToken: token, fridgeId,
          containerName: containerName.trim() || "스마트 용기", existingBatchId: selectedInventory.batchId });
        if (scope.active) setRegistered(result);
      } catch (registerError) {
        if (!scope.active) return;
        // A failed HTTP response does not imply that the transaction was rolled back.
        const recovered = await scanContainer(token).catch(() => null);
        if (!scope.active) return;
        if (recovered?.containerId != null) setRegistered(recovered);
        else throw registerError;
      }
    } catch (connectError) {
      if (scope.active) setError(getApiErrorMessage(connectError, "용기에 재료를 연결하지 못했어요. 입력은 유지되니 다시 시도해 주세요."));
    } finally {
      operationLock.current = false;
      if (mounted.current) setRegistering(false);
    }
  };

  return {
    containerName, setContainerName, selectedBatchId, setSelectedBatchId,
    inventories, inventoryLoading, inventoryError,
    retryInventories: () => { if (!operationLock.current) setInventoryAttempt((value) => value + 1); },
    selectedInventory, container, registering, error, connect,
    acceptRegistration: (result: ContainerScanResponse) => setRegistered(result),
  };
}
