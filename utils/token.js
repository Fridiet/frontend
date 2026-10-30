import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'user_jwt_token';

const PROFILE_KEY = 'user_profile';
let session = null;
let hydrated = false;
let revision = 0;
const listeners = new Set();
const publish = (value) => { session = value; listeners.forEach((listener) => listener()); };
export const getSessionSnapshot = () => session;
export const subscribeSession = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const tokenPayload = (token) => {
  try {
    const part = token.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = part.padEnd(
      part.length + ((4 - (part.length % 4)) % 4),
      '=',
    );

    const binary = atob(padded);
    const bytes = Uint8Array.from(
      binary,
      (char) => char.charCodeAt(0),
    );

    const decoded = new TextDecoder('utf-8').decode(bytes);

    return JSON.parse(decoded);
  } catch (error) {
    console.error('JWT payload 디코딩 실패:', error);
    return null;
  }
};
const tokenUserId = (token) => {
  try {
    const subject = Number(tokenPayload(token)?.sub);
    return Number.isSafeInteger(subject) && subject > 0 ? String(subject) : null;
  } catch { return null; }
};
const normalizeProvider = (value) => ['EMAIL', 'KAKAO', 'GOOGLE'].includes(value) ? value : '';
const socialProvider = (value) => ['KAKAO', 'GOOGLE'].includes(value) ? value : '';
const socialKey = (userId) => `user_social_provider:${userId}`;
export const getLinkedProvider = (profile) => socialProvider(profile?.socialProvider) || socialProvider(profile?.loginProvider);
const rememberProvider = async (userId, provider) => {
  if (provider) await AsyncStorage.setItem(socialKey(userId), provider);
};
export const hydrateSession = async () => {
  if (hydrated) return;
  const currentRevision = revision;
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (currentRevision !== revision) return;
    const userId = token && !isTokenExpired(token) ? tokenUserId(token) : null;
    let profile = null;
    try { profile = raw ? JSON.parse(raw) : null; } catch { /* Ignore invalid profile cache. */ }
    const validProfile = profile?.userId === userId && ['name', 'email', 'healthCondition', 'healthGoal'].every(key => typeof profile[key] === 'string');
    const payload = token ? tokenPayload(token) : null;
    const linked = userId ? getLinkedProvider(validProfile ? profile : null)
      || socialProvider(await AsyncStorage.getItem(socialKey(userId))) : '';
    if (currentRevision !== revision) return;
    if (userId) await rememberProvider(userId, linked);
    if (currentRevision !== revision) return;
    publish(userId ? {
      ...(validProfile ? profile : {}),
      userId,
      name: validProfile && profile.name ? profile.name : typeof payload?.name === 'string' ? payload.name : '',
      email: validProfile && profile.email ? profile.email : typeof payload?.email === 'string' ? payload.email : '',
      healthCondition: validProfile && profile.healthCondition ? profile.healthCondition : typeof payload?.healthCondition === 'string' ? payload.healthCondition : '',
      healthGoal: validProfile && profile.healthGoal ? profile.healthGoal : typeof payload?.healthGoal === 'string' ? payload.healthGoal : '',
      loginProvider: validProfile ? normalizeProvider(profile.loginProvider) : '',
      socialProvider: linked,
      socialId: validProfile && typeof profile?.socialId === 'string' ? profile.socialId : '',
    } : null);
    hydrated = true;
  } catch { /* A later mount can retry storage. */ }
};
export const saveToken = async (token, profile = {}) => {
  revision += 1;
  const userId = tokenUserId(token);
  if (!userId || isTokenExpired(token)) throw new Error('유효한 로그인 정보를 받지 못했습니다.');
  const payload = tokenPayload(token);
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  let previous = null;
  try { previous = raw ? JSON.parse(raw) : null; } catch { /* Ignore invalid profile cache. */ }
  const linked = getLinkedProvider(profile)
    || getLinkedProvider(previous?.userId === userId ? previous : null)
    || socialProvider(await AsyncStorage.getItem(socialKey(userId)));
  publish(null);
  const clean = {
    userId,
    name: typeof profile.name === 'string' && profile.name ? profile.name : typeof payload?.name === 'string' ? payload.name : '',
    email: typeof profile.email === 'string' && profile.email ? profile.email : typeof payload?.email === 'string' ? payload.email : '',
    healthCondition: typeof profile.healthCondition === 'string' && profile.healthCondition ? profile.healthCondition : typeof payload?.healthCondition === 'string' ? payload.healthCondition : '',
    healthGoal: typeof profile.healthGoal === 'string' && profile.healthGoal ? profile.healthGoal : typeof payload?.healthGoal === 'string' ? payload.healthGoal : '',
    loginProvider: normalizeProvider(profile.loginProvider) || 'EMAIL',
    socialProvider: linked,
    socialId: typeof profile?.socialId === 'string' ? profile.socialId : '',
  };
  await AsyncStorage.removeItem(PROFILE_KEY);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
  await rememberProvider(userId, linked);
  hydrated = true;
  publish(clean);
};

// 토큰 조회
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('토큰 조회 실패:', error);
    return null;
  }
};

// 토큰 삭제 (로그아웃 시)
export const removeToken = async ({ forgetSocialProvider = false } = {}) => {
  const userId = session?.userId;
  revision += 1;
  hydrated = true;
  publish(null);
  await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY, ...(forgetSocialProvider && userId ? [socialKey(userId)] : [])]);
};

export const updateSessionProfile = async (patch) => {
  if (!session?.userId) throw new Error('로그인 정보를 찾지 못했습니다.');
  const next = {
    ...session,
    ...(typeof patch.name === 'string' ? { name: patch.name.trim() } : {}),
    ...(typeof patch.email === 'string' ? { email: patch.email } : {}),
    ...(typeof patch.healthCondition === 'string' ? { healthCondition: patch.healthCondition.trim() } : {}),
    ...(typeof patch.healthGoal === 'string' ? { healthGoal: patch.healthGoal.trim() } : {}),
    ...(normalizeProvider(patch.loginProvider) ? { loginProvider: patch.loginProvider } : {}),
    ...(socialProvider(patch.socialProvider) ? { socialProvider: patch.socialProvider } : {}),
  };
  const currentRevision = revision;
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  await rememberProvider(next.userId, getLinkedProvider(next));
  if (currentRevision !== revision) return;
  publish(next);
};

// 저장된 JWT가 깨졌거나 만료되었는지 확인
export const isTokenExpired = (token) => {
  try {
    const payloadPart = token?.split('.')[1];
    if (!payloadPart) return true;

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const payload = JSON.parse(atob(padded));

    return typeof payload.exp !== 'number' || Date.now() >= payload.exp * 1000;
  } catch (error) {
    console.error('토큰 확인 실패:', error);
    return true;
  }
};

export const getTokenUserId = async () => {
  try {
    const token = await getToken();
    const payloadPart = token?.split('.')[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const payload = JSON.parse(atob(padded));
    const userId = Number(payload.sub);
    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
};
