# 배포 가이드 (Vercel)

Tool2Slides 를 Vercel 에 배포하는 전체 절차입니다. **키가 하나도 없어도 앱은 끝까지 동작**(샘플 분석 + mock 캡처 + 인메모리 저장)하지만, 실서비스에는 아래 키를 권장합니다.

---

## 0. 사전 준비

- GitHub 저장소: `kuekkuek85-85/url-to-slide`
- Vercel 계정 (GitHub 로그인 가능)
- (권장) Gemini API 키 — https://aistudio.google.com/apikey
- (선택) Firebase 프로젝트 (Firestore + Storage)

> ⚠️ **보안**: API 키를 채팅·코드·커밋에 절대 넣지 마세요. 노출된 키는 즉시 폐기 후 재발급하고, Vercel 환경변수에만 등록합니다. `.env.local` 은 `.gitignore` 로 커밋되지 않습니다.

---

## 1. Vercel 프로젝트 생성

1. Vercel 대시보드 → **Add New… → Project**
2. `url-to-slide` 저장소 Import
3. Framework: **Next.js** (자동 감지)
4. 배포 브랜치: 기본 `main`. 지금 작업본은 `claude/new-session-turr8w` 이므로, 먼저 main 에 머지하거나 Vercel 의 Production Branch 를 해당 브랜치로 지정
5. **Deploy** 누르기 전에 아래 2번(환경변수)을 먼저 등록 권장

---

## 2. 환경변수 등록

Vercel → Project → **Settings → Environment Variables**. (Production / Preview 모두 체크)

### 필수는 없음(폴백 동작), 권장 항목

| 변수 | 필요성 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | 권장 | 없으면 샘플 분석으로 폴백. 실제 분석 품질을 위해 등록 |
| `GEMINI_MODEL` | 선택 | 기본 `gemini-2.5-flash` |
| `CAPTURE_MODE` | 권장 | `chromium`(기본·실캡처) / `screenshot-api` / `mock` |
| `SCREENSHOT_API_URL` | 선택 | `screenshot-api` 모드에서 전용 API 쓸 때만. 비우면 Microlink 무료 티어 |

### Firebase (선택 — 영구 저장·공유가 필요할 때)

미설정 시 **인메모리 저장소**로 동작합니다(서버리스 재시작 시 데이터 휘발 → 데모용으로만).

**방법 A — 개별 변수**

| 변수 | 설명 |
|---|---|
| `FIREBASE_PROJECT_ID` | 프로젝트 ID |
| `FIREBASE_CLIENT_EMAIL` | 서비스 계정 이메일 |
| `FIREBASE_PRIVATE_KEY` | 서비스 계정 private key. **줄바꿈을 `\n` 으로 이스케이프**해서 한 줄로 입력 (코드가 `\n`→실제 줄바꿈으로 복원) |
| `FIREBASE_STORAGE_BUCKET` | 캡처 이미지 업로드 버킷 (예: `your-app.appspot.com`) |

**방법 B — 서비스 계정 JSON 통째로 (더 간단)**

| 변수 | 설명 |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | 서비스 계정 JSON 파일을 base64 인코딩한 문자열. 설정 시 위 개별 변수보다 우선 |
| `FIREBASE_STORAGE_BUCKET` | (Storage 쓸 경우 함께 등록) |

```bash
# 서비스 계정 JSON → base64 (로컬에서)
base64 -w0 service-account.json   # Linux
base64 service-account.json       # macOS
```

---

## 3. Functions(서버리스) 설정 — chromium 캡처용 중요

`/api/generate` 는 Playwright + `@sparticuz/chromium` 으로 실제 브라우저를 띄웁니다. 콜드스타트·메모리 여유가 필요합니다.

- **런타임**: 코드에 `export const runtime = "nodejs"` 지정됨 (Edge 아님)
- **타임아웃**: `export const maxDuration = 60` (캡처+분석 합산)
  - Vercel Hobby 플랜은 함수 최대 실행시간 제한이 있어 60초가 안 될 수 있음 → 필요 시 **Pro 플랜** 권장
- **메모리**: Project → Settings → Functions → **1024MB 이상** 권장 (chromium 실행)
- `next.config.mjs` 에서 `@sparticuz/chromium`·`playwright-core` 를 `serverComponentsExternalPackages` 로 지정해 번들 손상을 방지함 (수정 불필요)

> chromium 콜드스타트/번들 이슈가 크면 `CAPTURE_MODE=screenshot-api` 로 전환하면 외부 스크린샷 API(기본 Microlink)를 쓰므로 브라우저 번들이 필요 없습니다. 단, 다단계 인터랙션 캡처는 chromium 에서만 됩니다.

---

## 4. 배포 & 동작 확인

1. **Deploy** 실행 → 빌드 로그에서 `next build` 성공 확인
2. 배포 URL 접속:
   - `/deck/demo` — 키 없이 샘플 슬라이드 즉시 확인 (가장 빠른 헬스체크)
   - `/` — 실제 도구 URL 입력 → 생성 → `/review` 편집 → 게시 → `/deck/[id]`
3. **E2E 체크리스트**
   - [ ] `/api/generate` 가 60초 안에 응답 (chromium 캡처 성공)
   - [ ] 캡처가 랜딩/인터랙션/결과 다단계로 잡히는지
   - [ ] Gemini 4카테고리(기능/교육/기대효과/제안) 원고 품질
   - [ ] (Firebase 사용 시) 저장·공유 링크/QR·재접속 시 데이터 유지
   - [ ] PDF 저장(Ctrl/⌘+P) 슬라이드별 페이지 분할

---

## 5. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `/api/generate` 타임아웃 | Hobby 플랜 제한 → Pro 전환, 또는 `CAPTURE_MODE=screenshot-api` |
| 캡처 결과가 mock 으로 나옴 | chromium 실행 실패 폴백. Functions 메모리↑, 로그 확인 |
| 분석이 항상 똑같은 샘플 | `GEMINI_API_KEY` 미설정/오류 → 키 재확인 |
| 저장이 새로고침하면 사라짐 | Firebase 미설정(인메모리). `FIREBASE_*` 등록 |
| `FIREBASE_PRIVATE_KEY` 오류 | 줄바꿈을 `\n` 으로 이스케이프했는지 확인, 또는 방법 B(base64) 사용 |
| 이미지 로딩 안 됨 | `next.config.mjs` images remotePatterns 확인(이미 와일드카드 허용) |

---

## 6. 운영 팁

- **개인정보(PRD §10)**: 캡처는 더미값으로만. 실제 학생 데이터 입력 금지. 본인 권한 도구만 캡처.
- **비용**: Gemini 호출/캡처는 생성 시점에만 발생. 슬라이드 열람(`/deck/[id]`)은 정적에 가까움.
- **공유**: `shareId` 기반 읽기 전용 공개 링크 제공.
