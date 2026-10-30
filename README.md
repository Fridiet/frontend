# 실행 매뉴얼: 소스 코드 실행 환경 및 실행 방법

## 프론트엔드

### 1 실행 환경

- Node.js 22.x
- npm 10.x
- Expo SDK 54
- React Native 0.81.5

### 2 환경변수 설정

`frontend/.env` 파일에 다음 값을 설정합니다.

```dotenv
EXPO_PUBLIC_KAKAO_CLIENT_ID=<카카오 클라이언트 ID>
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<구글 클라이언트 ID>
EXPO_PUBLIC_REDIRECT_URI=fridiet://login-callback
EXPO_PUBLIC_BASE_URL=<백엔드 서버 주소>
```

### 3 실행 방법

프로젝트 루트에서 다음 명령을 실행합니다.

```bash
cd frontend
npm ci
npm run web -- --port 8081
```

실행 후 브라우저에서 <http://localhost:8081>로 접속합니다.

Expo Go로 실행할 경우 다음 명령을 사용합니다.

```bash
npm start -- --go
```
