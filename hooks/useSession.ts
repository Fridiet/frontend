import { useEffect, useSyncExternalStore } from "react";
import { hydrateSession, getSessionSnapshot, subscribeSession } from "../utils/token";

export function useSession() {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  useEffect(() => { void hydrateSession(); }, []);
  return session;
}
