export function getAiBaseUrl() {
  if (process.env.EXPO_PUBLIC_AI_BASE_URL) {
    return process.env.EXPO_PUBLIC_AI_BASE_URL.replace(/\/$/, "");
  }

  const backendUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (!backendUrl) return null;
  try {
    const parsed = new URL(backendUrl);
    parsed.port = "8000";
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return backendUrl.match(/:\d+\/?$/)
      ? backendUrl.replace(/:\d+\/?$/, ":8000")
      : null;
  }
}

