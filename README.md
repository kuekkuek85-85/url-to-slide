# Tool2Slides

수업평가 웹 앱의 **URL → AI 분석 → 웹 기반 슬라이드**를 자동 생성하는 도구입니다.
슬라이드는 **기능적 특징 / 교육적 특징 / 기대효과 / 제안** 4개 섹션으로 구성됩니다.

> Teacher in the Loop — AI 초안 → 교사 검토 → 슬라이드 보기 → PDF 저장

**DB가 없는 휘발성 설계**: 생성한 슬라이드는 서버나 외부 DB에 저장하지 않고
**브라우저(sessionStorage)에만** 보관합니다. 보관이 필요하면 **PDF로 저장**하세요.
덕분에 Firebase 등 외부 저장소 설정 없이 바로 배포·사용할 수 있습니다.

## 스택

- **Next.js (App Router)** on Vercel — 호스팅 + 생성 API + 슬라이드 페이지
- **Playwright (`playwright-core` + `@sparticuz/chromium`)** — 서버리스 headless 캡처
- **Gemini** — 캡처 + 텍스트 멀티모달 분석 → 4카테고리 원고 JSON
- **클라이언트 휘발성 저장** — sessionStorage (DB·서버 저장 없음)

## 동작 흐름

```
홈(/)  ── URL 입력 ──▶  POST /api/generate
                          1) Playwright 캡처 (랜딩 + 인터랙션 + 결과)
                          2) Gemini 분석 → 4카테고리 JSON
                          3) deck JSON 매핑(accent/img 부착)
        ◀── deck + shots ──┘  (sessionStorage: t2s:draft)
검토(/review) ── 교사 편집 ──▶ (sessionStorage: t2s:deck)
                                       │
슬라이드(/view) ◀─────────────────────┘  발표 + PDF로 저장
```

> 서버/DB를 거치지 않으므로 서버리스 인스턴스 간 데이터 불일치(404)가 발생하지 않습니다.

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

> **폴백 설계**: Gemini 키가 없으면 샘플 분석, 캡처가 실패하면 스크린샷 API → mock 으로 동작합니다. 따라서 키가 하나도 없어도 앱은 끝까지 돌아갑니다(`CAPTURE_MODE=mock` 권장).

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
| `/view` | 생성한 슬라이드 발표 + PDF 저장 (휘발성, sessionStorage) |
| `/deck/demo` | 샘플 데모 슬라이드 (공유 링크/QR 가능) |

## 슬라이드 조작

- 키보드: ←/→ · Space · Home/End
- 마우스: 화면 좌/우 클릭, 하단 도트
- PDF 저장: 우상단 "PDF로 저장" 또는 Ctrl/⌘+P (`@media print` 로 슬라이드별 페이지 분할)

## 배포 (Vercel)

전체 절차·환경변수·트러블슈팅은 **[DEPLOY.md](./DEPLOY.md)** 참고.

1. 저장소를 Vercel 에 연결
2. 환경변수 등록 (`GEMINI_API_KEY` 등 — 위 표)
3. Functions 메모리 1024MB+ 권장 (`/api/generate` 는 `maxDuration = 60`)

> DB가 없으므로 별도 데이터베이스 연결/설정이 필요 없습니다.

## 보안 / 개인정보 (PRD §10)

- 더미값으로만 캡처하며, 실제 학생 데이터 입력은 금지합니다.
- 본인이 권한을 가진 도구만 캡처하세요.
- 생성 결과는 사용자 브라우저에만 보관되며 서버에 남지 않습니다.

## 로드맵

- **P1** `/api/generate` 캡처 + 분석 → deck JSON ✅
- **P2** 슬라이드 컴포넌트 + 발표/PDF ✅
- **P3** 검토·편집 UI ✅
- **P4** 다단계 캡처 고도화, 청중 프리셋 톤 재생성, 테마 (진행 중)
