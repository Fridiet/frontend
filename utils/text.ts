export function normalizeKoreanText(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");
}

