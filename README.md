# Tool2Slides

수업평가 웹 앱의 **URL → AI 분석 → 웹 기반 슬라이드 사이트**를 자동 생성하는 도구입니다.
슬라이드는 **기능적 특징 / 교육적 특징 / 기대효과 / 제안** 4개 섹션으로 구성됩니다.

> Teacher in the Loop — AI 초안 → 교사 검토·확정 → 슬라이드 게시

## 스택

- **Next.js (App Router)** on Vercel — 호스팅 + 서버리스 API + 슬라이드 페이지
- **Playwright (`playwright-core` + `@sparticuz/chromium`)** — 서버리스 headless 캡처
- **Gemini** — 캡처 + 텍스트 멀티모달 분석 → 4카테고리 원고 JSON
- **Firebase (Firestore + Storage)** — deck 저장 / 캡처 이미지 / 공유 링크 (선택)

## 동작 흐름

```
홈(/)  ── URL 입력 ──▶  POST /api/generate
                          1) Playwright 캡처 (랜딩 + 인터랙션 + 결과)
                          2) Gemini 분석 → 4카테고리 JSON
                          3) deck JSON 매핑(accent/img 부착)
        ◀── deck + shots ──┘
검토(/review) ── 교사 편집 ──▶ POST /api/decks (Firestore 저장)
                                       │
슬라이드(/deck/[id]) ◀────────────────┘  링크/QR 공유 · PDF 저장
```

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 참고)
npm run dev                  # http://localhost:3000
```

데모 슬라이드는 키 없이 바로 볼 수 있습니다: `/deck/demo`

## 환경변수 (`.env.local`)

| 변수 | 설명 |
|---|---|
| `GEMINI_API_KEY` | Gemini 키. 없으면 샘플 분석으로 폴백 |
| `GEMINI_MODEL` | 기본 `gemini-2.5-flash` |
| `CAPTURE_MODE` | `chromium`(기본) · `screenshot-api` · `mock` |
| `SCREENSHOT_API_URL` | (선택) 스크린샷 API 폴백 엔드포인트 |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin 인증 |
| `FIREBASE_STORAGE_BUCKET` | 캡처 이미지 업로드 버킷 |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | (대안) 서비스 계정 JSON 을 base64 로 |

> **폴백 설계**: Gemini 키가 없으면 샘플 분석, 캡처가 실패하면 스크린샷 API → mock, Firebase 가 없으면 인메모리 저장소로 동작합니다. 따라서 키가 하나도 없어도 앱은 끝까지 돌아갑니다(`CAPTURE_MODE=mock` 권장).

## 캡처 모드 (PRD §4)

- **기본 `chromium`**: `@sparticuz/chromium` + `playwright-core`. API Route 는 Node.js 런타임(`runtime = "nodejs"`), `maxDuration = 60`.
- 번들/타임아웃 이슈가 크면 `CAPTURE_MODE=screenshot-api` (Microlink 등) 로 폴백.
- 로컬에서 브라우저 없이 파이프라인만 보려면 `CAPTURE_MODE=mock`.

`next.config.mjs` 에서 `@sparticuz/chromium`·`playwright-core` 를 서버 외부 패키지로 지정해 번들 손상을 막습니다.

## 페이지

| 경로 | 설명 |
|---|---|
| `/` | 생성 화면 (URL 입력 + 진행 상태) |
| `/review` | 검토·편집 (캡처 관리, 4카테고리 편집, 청중 프리셋) |
| `/deck/[id]` | 슬라이드 재생 + 공유(링크/QR) + PDF 저장 |
| `/deck/demo` | 샘플 데모 슬라이드 |
| `/decks` | 내 슬라이드 목록 (열기/복제/삭제) |

## 슬라이드 조작

- 키보드: ←/→ · Space · Home/End
- 마우스: 화면 좌/우 클릭, 하단 도트
- PDF 저장: 우상단 "PDF 저장" 또는 Ctrl/⌘+P (`@media print` 로 슬라이드별 페이지 분할)

## 배포 (Vercel)

전체 절차·환경변수·트러블슈팅은 **[DEPLOY.md](./DEPLOY.md)** 참고.

1. 저장소를 Vercel 에 연결
2. 환경변수 등록 (위 표 / DEPLOY.md)
3. Functions 메모리 1024MB+ 권장 (`/api/generate` 는 `maxDuration = 60`)

## 보안 / 개인정보 (PRD §10)

- 더미값으로만 캡처하며, 실제 학생 데이터 입력은 금지합니다.
- 본인이 권한을 가진 도구만 캡처하세요.
- `shareId` 로 읽기 전용 공개 링크를 제공합니다.

## 로드맵

- **P1** `/api/generate` 캡처 + 분석 → deck JSON ✅
- **P2** 슬라이드 컴포넌트 + `/deck/[id]` ✅
- **P3** 검토·편집 UI + Firebase 저장·공유 ✅
- **P4** 다단계 캡처 고도화, 청중 프리셋 톤 재생성, 테마 (진행 중)
