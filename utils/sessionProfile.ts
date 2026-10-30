import { getMyProfile, updateProfile } from "../api/userApi";
import { getSessionSnapshot, getToken, updateSessionProfile } from "./token";

type ProfilePatch = {
  name?: string;
  email?: string;
  healthCondition?: string;
  healthGoal?: string;
  socialProvider?: string;
};

export function profileFromResponse(response: unknown): ProfilePatch {
  if (!response || typeof response !== "object") throw new Error("프로필을 불러오지 못했어요.");
  const outer = response as Record<string, unknown>;
  const value = outer.data && typeof outer.data === "object"
    ? outer.data as Record<string, unknown> : outer;
  if (typeof value.name !== "string" || !value.name.trim()) throw new Error("프로필에서 이름을 확인하지 못했어요.");
  const patch: ProfilePatch = {};
  for (const key of ["name", "email", "healthCondition", "healthGoal"] as const) {
    if (typeof value[key] === "string") patch[key] = value[key].trim();
    else if (value[key] === null) patch[key] = "";
  }
  if (["EMAIL", "KAKAO", "GOOGLE"].includes(String(value.socialProvider))) {
    patch.socialProvider = String(value.socialProvider);
  }
  return patch;
}

const requests = new Map<string, Promise<void>>();
let profileRevision = 0;

export async function refreshCurrentUserProfile() {
  const userId = getSessionSnapshot()?.userId;
  const token = await getToken();
  if (!userId || !token || getSessionSnapshot()?.userId !== userId) return;
  const existing = requests.get(token);
  if (existing) return existing;
  const revision = profileRevision;
  const request = (async () => {
    const response = await getMyProfile(token);
    if (getSessionSnapshot()?.userId !== userId || await getToken() !== token) return;
    if (revision !== profileRevision) return;
    const patch = profileFromResponse(response);
    await updateSessionProfile(patch);
  })();
  requests.set(token, request);
  try { await request; }
  finally { if (requests.get(token) === request) requests.delete(token); }
}

export async function saveCurrentUserProfile(input: {
  healthCondition: string;
  healthGoal: string;
}) {
  const payload = {
    healthCondition: input.healthCondition.trim(),
    healthGoal: input.healthGoal.trim(),
  };
  const previous = getSessionSnapshot();
  const token = await getToken();
  const assertCurrentAccount = async () => {
    const currentToken = await getToken();
    if (!previous?.userId || !token || currentToken !== token || getSessionSnapshot()?.userId !== previous.userId) {
      throw new Error("로그인 정보가 변경됐어요. 다시 로그인해 주세요.");
    }
  };
  await assertCurrentAccount();
  profileRevision++;
  await updateProfile(payload, token);
  await assertCurrentAccount();
  profileRevision++;
  await updateSessionProfile(payload);
}
