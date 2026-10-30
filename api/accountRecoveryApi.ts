import apiClient from "./client";

export async function sendRecoveryCode(email: string) {
  await apiClient.post("/api/auth/email/send/reset-password", { email });
}

export async function verifyRecoveryCode(email: string, code: string) {
  const response = await apiClient.post<{ resetToken: string }>("/api/auth/email/verify", { email, code });
  return response.data.resetToken;
}

export async function resetPasswordWithToken(resetToken: string, newPassword: string) {
  const response = await apiClient.post("/api/users/password/reset", { resetToken, newPassword });
  return response.data;
}
