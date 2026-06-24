import type { CaptureResult, Shot } from "./types";

const VIEWPORT = { width: 1280, height: 800 };
const NAV_TIMEOUT = 25_000;

/** SVG 기반 목(mock) 캡처 — 키/브라우저 없이도 파이프라인을 검증한다. */
function mockShot(label: string, title: string, color: string): Shot {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWPORT.width}" height="${VIEWPORT.height}">
    <rect width="100%" height="100%" fill="#0b1020"/>
    <rect x="40" y="40" width="${VIEWPORT.width - 80}" height="120" rx="16" fill="${color}" opacity="0.9"/>
    <text x="64" y="115" font-family="sans-serif" font-size="44" fill="#fff">${title}</text>
    <text x="64" y="${VIEWPORT.height - 60}" font-family="sans-serif" font-size="24" fill="#94a3b8">mock capture · ${label}</text>
  </svg>`;
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return { label, src, title, text: `${title} (mock)` };
}

function mockCapture(url: string): CaptureResult {
  return {
    url,
    pageTitle: "수업평가 도구 (mock)",
    mode: "mock",
    warning: "CAPTURE_MODE=mock — 실제 화면이 아닌 자리표시 이미지입니다.",
    shots: [
      mockShot("landing", "랜딩 화면", "#3b82f6"),
      mockShot("interaction", "평가/문제 화면", "#10b981"),
      mockShot("result", "결과/피드백 화면", "#f59e0b"),
    ],
  };
}

/** 외부 스크린샷 API 폴백 (예: Microlink screenshot). 랜딩 1컷만 보장. */
async function screenshotApiCapture(url: string): Promise<CaptureResult> {
  const base = process.env.SCREENSHOT_API_URL?.trim();
  // 기본값: Microlink (무료 티어, 키 불필요). 운영시 전용 API 권장.
  const endpoint = base
    ? `${base}${base.includes("?") ? "&" : "?"}url=${encodeURIComponent(url)}`
    : `https://api.microlink.io/?url=${encodeURIComponent(
        url
      )}&screenshot=true&meta=true&embed=screenshot.url`;

  const res = await fetch(endpoint, { redirect: "follow" });
  if (!res.ok) throw new Error(`스크린샷 API 오류: ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  let imgUrl: string;
  if (contentType.includes("application/json")) {
    const json: any = await res.json();
    imgUrl =
      json?.data?.screenshot?.url || json?.screenshot?.url || json?.url || "";
    if (!imgUrl) throw new Error("스크린샷 API 응답에서 이미지 URL을 찾지 못했습니다.");
  } else {
    // embed 모드: 바로 이미지 바이트
    const buf = Buffer.from(await res.arrayBuffer());
    const src = `data:${contentType || "image/png"};base64,${buf.toString("base64")}`;
    return {
      url,
      pageTitle: url,
      mode: "screenshot-api",
      shots: [{ label: "landing", src, title: url }],
    };
  }

  const imgRes = await fetch(imgUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const src = `data:${imgRes.headers.get("content-type") || "image/png"};base64,${buf.toString("base64")}`;
  return {
    url,
    pageTitle: url,
    mode: "screenshot-api",
    shots: [{ label: "landing", src, title: url }],
  };
}

/** Playwright + @sparticuz/chromium 캡처 (PRD §4 권장 경로). */
async function chromiumCapture(url: string): Promise<CaptureResult> {
  // 동적 import — 번들/콜드스타트 비용을 캡처 시점으로 미룬다.
  const chromium = (await import("@sparticuz/chromium")).default;
  const { chromium: pw } = await import("playwright-core");

  const executablePath = await chromium.executablePath();
  const browser = await pw.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });

  const TARGET_SHOTS = 3;
  const shots: Shot[] = [];
  const notes: string[] = [];
  let pageTitle = url;

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT }).catch(
      async () => {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      }
    );
    await page.waitForTimeout(1200);

    pageTitle = (await page.title()) || url;

    // 동일 화면 중복 방지를 위한 간이 서명 집합.
    const sigs = new Set<string>();
    const grab = async (label: string, title?: string): Promise<boolean> => {
      try {
        const buf = await page.screenshot({ type: "jpeg", quality: 70, fullPage: false });
        const sig = `${buf.length}:${buf.subarray(0, 1024).toString("base64")}`;
        if (sigs.has(sig)) return false; // 직전과 같은 화면 → 스킵
        sigs.add(sig);
        const bodyText = (await page
          .evaluate(() => document.body?.innerText || "")
          .catch(() => "")) as string;
        shots.push({
          label,
          src: `data:image/jpeg;base64,${buf.toString("base64")}`,
          title: title ?? pageTitle,
          text: bodyText.replace(/\s+/g, " ").trim().slice(0, 2000),
        });
        return true;
      } catch {
        return false;
      }
    };

    // 보이고 활성화된 클릭 대상 중, 키워드 우선 → 없으면 첫 후보를 클릭한다.
    const clickStep = async (keywords: string[]): Promise<boolean> => {
      const clickable = page.locator(
        'button, a[role="button"], [role="button"], input[type="submit"], input[type="button"], a[href]'
      );
      const n = Math.min(await clickable.count().catch(() => 0), 40);
      const candidates: number[] = [];
      let keywordHit = -1;
      for (let i = 0; i < n; i++) {
        const el = clickable.nth(i);
        if (!(await el.isVisible().catch(() => false))) continue;
        if (!(await el.isEnabled().catch(() => false))) continue;
        candidates.push(i);
        if (keywordHit === -1) {
          const txt = ((await el.innerText().catch(() => "")) || "").toLowerCase();
          if (keywords.some((k) => txt.includes(k.toLowerCase()))) keywordHit = i;
        }
      }
      const target = keywordHit !== -1 ? keywordHit : candidates[0];
      if (target === undefined) return false;
      await clickable.nth(target).click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1800);
      return true;
    };

    // 1) 랜딩
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await grab("landing", pageTitle);

    // 2) 입력창 더미 입력 (PRD §5, §10 — 실제 학생데이터 금지)
    const inputs = page.locator(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea'
    );
    const inputCount = await inputs.count().catch(() => 0);
    let filled = 0;
    for (let i = 0; i < Math.min(inputCount, 6); i++) {
      const el = inputs.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const type = (await el.getAttribute("type").catch(() => "")) || "text";
      const value = type === "number" || type === "tel" ? "10" : "샘플";
      if (await el.fill(value).then(() => true).catch(() => false)) filled++;
    }
    if (filled > 0) notes.push(`입력칸 ${filled}곳에 더미값 입력`);

    // 3) 인터랙션 화면 (시작/제출/평가류 버튼)
    const startKeywords = ["시작", "제출", "평가", "다음", "확인", "응답", "참여", "start", "submit", "begin", "next", "go"];
    if (await clickStep(startKeywords)) {
      await grab("interaction", "인터랙션 화면");
    }

    // 4) 결과/피드백 화면 (한 단계 더 진행)
    const resultKeywords = ["결과", "제출", "완료", "확인", "다음", "보기", "result", "done", "finish", "submit"];
    if (shots.length < TARGET_SHOTS && (await clickStep(resultKeywords))) {
      await grab("result", "결과/피드백 화면");
    }

    // 5) 보완: 인터랙션 전환이 적어 3컷을 못 채웠으면 스크롤 위치 컷으로 채운다.
    if (shots.length < TARGET_SHOTS) {
      const positions = [0.5, 1.0];
      for (const p of positions) {
        if (shots.length >= TARGET_SHOTS) break;
        await page
          .evaluate((r) => window.scrollTo(0, document.body.scrollHeight * r), p)
          .catch(() => {});
        await page.waitForTimeout(700);
        await grab(`scroll-${Math.round(p * 100)}`, "추가 화면");
      }
      if (shots.length < TARGET_SHOTS) {
        notes.push("화면 전환이 적어 캡처 수가 목표보다 적습니다(편집에서 이미지 업로드 가능).");
      } else {
        notes.push("인터랙션 전환이 적어 일부는 스크롤 화면으로 보완했습니다.");
      }
    }
  } catch (err) {
    notes.push(`캡처 일부 실패: ${(err as Error).message}`);
  } finally {
    await browser.close().catch(() => {});
  }

  if (shots.length === 0) {
    throw new Error("랜딩 캡처에 실패했습니다.");
  }

  return {
    url,
    pageTitle,
    mode: "chromium",
    shots,
    warning: notes.length ? notes.join(" · ") : undefined,
  };
}

/** 모드에 따라 캡처를 수행하고, 실패 시 단계적으로 폴백한다. */
export async function captureSite(url: string): Promise<CaptureResult> {
  const mode = (process.env.CAPTURE_MODE || "chromium").toLowerCase();

  if (mode === "mock") return mockCapture(url);
  if (mode === "screenshot-api") {
    try {
      return await screenshotApiCapture(url);
    } catch (err) {
      return { ...mockCapture(url), warning: `스크린샷 API 실패 → mock: ${(err as Error).message}` };
    }
  }

  // 기본: chromium → 실패 시 screenshot-api → 실패 시 mock
  try {
    return await chromiumCapture(url);
  } catch (err) {
    try {
      const r = await screenshotApiCapture(url);
      return { ...r, warning: `Chromium 실패로 스크린샷 API 폴백: ${(err as Error).message}` };
    } catch (err2) {
      return {
        ...mockCapture(url),
        warning: `캡처 실패(Chromium·API 모두) → mock: ${(err2 as Error).message}`,
      };
    }
  }
}
