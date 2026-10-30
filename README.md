# Fridiet Frontend

냉장고 재고, 영수증 OCR 등록, 레시피 추천, QR 용기, 식단 캘린더와 월간 결산을
제공하는 Expo / React Native 앱입니다. Expo SDK 54를 사용합니다.

## 실행

Node.js와 npm을 설치하고 `.env.example`을 `.env`로 복사합니다.
`EXPO_PUBLIC_BASE_URL`을 실행 중인 백엔드 주소로 설정하세요.
모바일의 localhost는 PC가 아니라 기기 자신을 가리키므로 환경에 맞는 주소가 필요합니다.

```bash
npm ci
npx expo start --go
```

Expo Go에서 Firebase 설정 파일 없이 테스트하려면 `FRIDIET_EXPO_GO=1`을 설정합니다.
PowerShell: `$env:FRIDIET_EXPO_GO="1"`.
Expo Go도 SDK 54와 호환되어야 하며 일부 기능은 개발 빌드가 필요합니다.
푸시 알림/설치 앱 빌드에는 자신의 Firebase 파일과 EAS 설정을 별도로 준비합니다.
`google-services.json`, `GoogleService-Info.plist`, 서명 키는 공개 저장소에 넣지 않습니다.

## 검증

```bash
npm run test:features
npx tsc --noEmit
```

소셜 로그인 이름 처리에는 최신 UTF-8 JWT 디코딩 수정이 포함되어 있습니다.
백엔드 역시 이름 필드를 발급하는 버전을 사용하고 기존 로그인은 다시 수행해야 합니다.

## 연결 및 저장소

앱 → 백엔드 → AI / DB 구조입니다. 인증 토큰, OpenAI 키와 DB 비밀번호는 서버 전용입니다.
`EXPO_PUBLIC_` 값은 앱에 포함되므로 비밀 값을 넣으면 안 됩니다.
기존 EAS 프로젝트 식별자는 담당자의 EAS 프로젝트에 맞게 별도로 연결하세요.

- [Frontend](https://github.com/Fridiet/frontend)
- [Backend](https://github.com/Fridiet/backend)
- [AI](https://github.com/Fridiet/ai)

기존 통합 프로젝트 [euna22/fridiet](https://github.com/euna22/fridiet)의 작업본에서 분리했습니다.
운영 환경 파일·개인 데이터·과거 Git 이력과 APK는 포함하지 않습니다.
