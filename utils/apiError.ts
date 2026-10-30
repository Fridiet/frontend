import { isAxiosError } from "axios";

export function getApiErrorMessage(
  error: unknown,
  fallback = "요청을 처리하지 못했습니다.",
) {
  if (!isAxiosError(error)) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return fallback;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object" && "message" in data) {
    const message = data.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (!error.response) {
    return "서버에 연결할 수 없습니다. 네트워크와 서버 주소를 확인해 주세요.";
  }

  return fallback;
}
