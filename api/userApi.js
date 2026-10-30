import apiClient from './client';

export const getMyProfile = async (token) => {
  const path = process.env.EXPO_PUBLIC_PROFILE_ENDPOINT?.trim() || '/api/users/me';
  const response = await apiClient.get(path, {
    timeout: 10000,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
};

export const signup = async (signupData) => {
  const response = await apiClient.post('/api/auth/signup', signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await apiClient.post('/api/auth/login', loginData);
  return response.data;
};

export const logout = async () => {
  const response = await apiClient.post('/api/auth/logout');
  return response.data;
}

export const sendSignupVerificationCode = async (email) => {
  await apiClient.post('/api/auth/email/send/signup', { email });
}

export const verifySignupCode = async (email, code) => {
  await apiClient.post('/api/auth/email/verify', { email, code });
  return true;
}

/**
 * 일반 로그인과 소셜 로그인 연동
 * @param {object} data - { provide: 'KAKAO' | 'GOOGLE', tokenOrCode: string}
 */
export const linkSocialAccount = async (data) => {
  const response = await apiClient.post('/api/users/me/social-link', data);
  return response.data;
}


/**
 * 정보 수정
 * @param {Object} profileData - { healthCondition, healthGoal }
 */
export const updateProfile = async (profileData, token) => {
  const response = await apiClient.patch('/api/users/me/profile', profileData, {
    timeout: 10000,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}

/**
 * 비밀번호 찾기 - 본인 확인
 * @param {object} data = {email, name}
 */
export const verifyUserForPassword = async (data) => {
  const response = await apiClient.post('/api/users/password/verify', data);
  return response.data;
}

/**
 * 비밀번호 찾기 - 새 비밀번호 설정
 * @param {object} data - {email, newPassword}
 */
export const resetPassword = async (data) => {
  const response = await apiClient.post('/api/users/password/reset', data);
  return response.data;
}

/**
 * 회원 탈퇴
 * @param {string|null} googleAccessToken - 구글 회원 탈퇴 시에만 필요한 AccessToken
 */
export const deleteAccount = async (googleAccessToken = null) => {
  const config = {};

  if(googleAccessToken) {
    config.headers = {
      'X-Google-Access-Token': googleAccessToken,
    };
  }

  const response = await apiClient.delete('/api/users/me', config);
  return response.data;
}
