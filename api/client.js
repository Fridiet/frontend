import { create } from 'axios';
import { getToken } from '../utils/token';

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

const apiClient = create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420',
  },
});

const getTokenUserId = (authorization) => {
  try {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    const payloadPart = token?.split('.')[1];
    if (!payloadPart) return undefined;

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    return JSON.parse(atob(padded)).sub;
  } catch {
    return undefined;
  }
};

apiClient.interceptors.request.use(
  async(config) => {
    const token = await getToken();
    if(token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      const authorization =
        error.config?.headers?.Authorization ??
        error.config?.headers?.get?.('Authorization');
      console.error('[API 오류]', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        userId: getTokenUserId(authorization),
      });
    }
    return Promise.reject(error);
  },
);

export default apiClient;
