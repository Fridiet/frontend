export function extractQrToken(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const token = url.searchParams.get("token")?.trim();
    return token || null;
  } catch {
    return value;
  }
}
