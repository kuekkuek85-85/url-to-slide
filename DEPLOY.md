# 배포 가이드 (Vercel)

Tool2Slides 를 Vercel 에 배포하는 절차입니다.

> **DB가 없습니다.** 생성한 슬라이드는 사용자 브라우저(sessionStorage)에만 보관되는
> 휘발성이며, 보관은 **PDF 저장**으로 합니다. 따라서 데이터베이스 연결·설정이 전혀
> 필요 없고, 환경변수도 사실상 Gemini 키 하나면 충분합니다.

---

## 0. 사전 준비

- GitHub 저장소: `kuekkuek85-85/url-to-slide`
- Vercel 계정 (GitHub 로그인 가능)
- (권장) Gemini API 키 — https://aistudio.google.com/apikey

> ⚠️ **보안**: API 키를 채팅·코드·커밋에 절대 넣지 마세요. 노출된 키는 즉시 폐기 후 재발급하고, Vercel 환경변수에만 등록합니다. `.env.local` 은 `.gitignore` 로 커밋되지 않습니다.

---

## 1. Vercel 프로젝트 생성

1. Vercel 대시보드 → **Add New… → Project**
2. `url-to-slide` 저장소 Import
3. Framework: **Next.js** (자동 감지)
4. 배포 브랜치: 기본 `main`. 작업본이 `claude/new-session-turr8w` 이면 main 에 머지하거나 Vercel 의 Production Branch 를 해당 브랜치로 지정
5. **Deploy** 전에 2번(환경변수) 등록 권장

---

## 2. 환경변수 등록

Vercel → Project → **Settings → Environment Variables** (Production / Preview 모두 체크).

| 변수 | 필요성 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | 권장 | 없으면 샘플 분석으로 폴백. 실제 분석 품질을 위해 등록 |
| `GEMINI_MODEL` | 선택 | 기본 `gemini-2.5-flash` |
| `CAPTURE_MODE` | 권장 | `chromium`(기본·실캡처) / `screenshot-api` / `mock` |
| `SCREENSHOT_API_URL` | 선택 | `screenshot-api` 모드에서 전용 API 쓸 때만. 비우면 Microlink 무료 티어 |

> 키가 하나도 없어도 앱은 동작합니다(샘플 분석 + mock 캡처). 실서비스 품질을 위해 `GEMINI_API_KEY` 만 넣으면 됩니다.

---

## 3. Functions(서버리스) 설정 — chromium 캡처용

`/api/generate` 는 Playwright + `@sparticuz/chromium` 으로 실제 브라우저를 띄웁니다.
설정은 3가지 경로가 있습니다.

### 3-1. 코드로 지정 (이미 적용됨)
라우트 파일 상단에 박혀 있어 배포 시 자동 적용됩니다. 별도 작업 불필요.

```ts
// src/app/api/generate/route.ts
export const runtime = "nodejs";   // Edge 아님
export const maxDuration = 60;     // 최대 실행 60초
```

### 3-2. 대시보드 (메모리/CPU)
Project → **Settings → Functions** 에서:
- **Function Max Duration** — 기본 타임아웃 (코드의 `maxDuration` 이 함수별로 우선)
- **Function CPU / Memory** — chromium 실행용으로 **1024MB 이상** 권장
- 변경 후 **Redeploy** 해야 반영

### 3-3. `vercel.json` (레포에 고정)
대시보드 대신 코드로 고정하고 싶으면:

```json
{
  "functions": {
    "src/app/api/generate/route.ts": { "maxDuration": 60, "memory": 1024 }
  }
}
```

> ⚠️ **Hobby(무료) 플랜은 함수 최대 실행시간이 제한**되어 chromium 캡처가 타임아웃 날 수 있습니다 → **Pro 플랜** 권장, 또는 `CAPTURE_MODE=screenshot-api` 로 전환(브라우저 없이 외부 API 캡처라 가벼움).

`next.config.mjs` 에서 `@sparticuz/chromium`·`playwright-core` 를 `serverComponentsExternalPackages` 로 지정해 번들 손상을 방지합니다(수정 불필요).

---

## 4. 배포 & 동작 확인

1. **Deploy** → 빌드 로그에서 `next build` 성공 확인
2. 배포 URL 접속:
   - `/deck/demo` — 키 없이 샘플 슬라이드 즉시 확인 (가장 빠른 헬스체크)
   - `/` — 실제 도구 URL 입력 → 생성 → `/review` 편집 → **슬라이드 보기** → `/view` → **PDF로 저장**
3. **E2E 체크리스트**
   - [ ] `/api/generate` 가 60초 안에 응답 (캡처 성공)
   - [ ] 캡처가 랜딩/인터랙션/결과 다단계로 잡히는지
   - [ ] Gemini 4카테고리(기능/교육/기대효과/제안) 원고 품질
   - [ ] `/view` 에서 슬라이드 재생 + "PDF로 저장" 동작 (슬라이드별 페이지 분할)

> 생성한 슬라이드는 브라우저 **메모리에 보관**(용량이 작으면 sessionStorage에도 백업되어 새로고침 생존)됩니다. **페이지를 새로고침하거나 탭을 닫으면 사라질 수 있으니** 보관은 PDF 저장으로 하세요. 캡처 이미지가 커도 용량 오류 없이 동작합니다.

---

## 5. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `/api/generate` 타임아웃 | Hobby 플랜 제한 → Pro 전환, 또는 `CAPTURE_MODE=screenshot-api` |
| 캡처 결과가 mock 으로 나옴 | chromium 실행 실패 폴백. Functions 메모리↑, 로그 확인 |
| 분석이 항상 똑같은 샘플 | `GEMINI_API_KEY` 미설정/오류 → 키 재확인 |
| `/view` 가 홈으로 튕김 | sessionStorage 에 deck 없음(직접 URL 진입/탭 새로 염). 생성→검토 흐름으로 진입 |
| 슬라이드를 다시 못 봄 | 휘발성 설계. 보관은 PDF 저장으로 |

---

## 6. 운영 팁

- **개인정보(PRD §10)**: 캡처는 더미값으로만. 실제 학생 데이터 입력 금지. 본인 권한 도구만 캡처.
- **비용**: Gemini 호출/캡처는 생성 시점에만 발생. 슬라이드 열람은 정적에 가까움.
- **보관/공유**: PDF로 저장해 공유하세요. (DB가 없어 영구 공유 링크는 제공하지 않으며, `/deck/demo` 만 고정 링크입니다.)
