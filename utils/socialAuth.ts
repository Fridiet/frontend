export function socialAuthorizationUrl(
  provider: "KAKAO" | "GOOGLE",
  clientId: string | undefined,
  baseUrl: string | undefined,
  purpose: "login" | "link" = "login",
) {
  const id = clientId?.trim();
  if (!id || !baseUrl || /\s|EXPO_PUBLIC_/.test(id)
    || (provider === "GOOGLE" && !/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id))) {
    throw new Error("앱의 로그인 설정을 확인할 수 없어요. 고객센터에 문의해 주세요.");
  }
  const base = new URL(baseUrl.trim());
  if (!["http:", "https:"].includes(base.protocol) || base.search || base.hash) {
    throw new Error("앱의 서버 주소를 확인해 주세요.");
  }
  const redirect = `${base.toString().replace(/\/+$/, "")}/${purpose}/oauth2/code/${provider.toLowerCase()}`;
  const params = new URLSearchParams({ response_type: "code", client_id: id, redirect_uri: redirect });
  if (provider === "GOOGLE") params.set("scope", "email profile");
  const endpoint = provider === "KAKAO" ? "https://kauth.kakao.com/oauth/authorize" : "https://accounts.google.com/o/oauth2/v2/auth";
  return `${endpoint}?${params.toString()}`;
}
