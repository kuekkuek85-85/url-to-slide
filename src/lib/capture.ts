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

  const shots: Shot[] = [];
  let pageTitle = url;
  let warning: string | undefined;

  try {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT }).catch(
      async () => {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      }
    );
    await page.waitForTimeout(1200);

    pageTitle = (await page.title()) || url;

    const grab = async (label: string, title?: string) => {
      const buf = await page.screenshot({ type: "jpeg", quality: 70, fullPage: false });
      const bodyText = (await page.evaluate(() => document.body?.innerText || "").catch(
        () => ""
      )) as string;
      shots.push({
        label,
        src: `data:image/jpeg;base64,${buf.toString("base64")}`,
        title: title ?? pageTitle,
        text: bodyText.replace(/\s+/g, " ").trim().slice(0, 2000),
      });
    };

    // 1) 랜딩 풀샷
    await grab("landing", pageTitle);

    // 2) 입력창 더미 입력 (PRD §5, §10 — 실제 학생데이터 금지)
    const inputs = page.locator(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'
    );
    const inputCount = await inputs.count().catch(() => 0);
    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      await inputs
        .nth(i)
        .fill("샘플")
        .catch(() => {});
    }

    // 3) 주요 버튼(시작/제출/평가류) 클릭 → 다음 화면
    const buttonKeywords = ["시작", "제출", "평가", "다음", "확인", "start", "submit", "begin"];
    const clickable = page.locator('button, a[role="button"], [role="button"], input[type="submit"]');
    const clickCount = await clickable.count().catch(() => 0);
    let clicked = false;
    for (let i = 0; i < clickCount; i++) {
      const txt = ((await clickable.nth(i).innerText().catch(() => "")) || "").toLowerCase();
      if (buttonKeywords.some((k) => txt.includes(k.toLowerCase()))) {
        await clickable
          .nth(i)
          .click({ timeout: 4000 })
          .catch(() => {});
        clicked = true;
        break;
      }
    }
    if (!clicked && clickCount > 0) {
      await clickable
        .first()
        .click({ timeout: 4000 })
        .catch(() => {});
      clicked = true;
    }

    if (clicked) {
      await page.waitForTimeout(1800);
      await grab("interaction", "인터랙션 화면");

      // 4) 한 번 더 진행해 결과/피드백 화면 시도
      const next = page.locator('button, [role="button"], input[type="submit"]');
      const nextCount = await next.count().catch(() => 0);
      if (nextCount > 0) {
        await next
          .first()
          .click({ timeout: 4000 })
          .catch(() => {});
        await page.waitForTimeout(1800);
        await grab("result", "결과/피드백 화면");
      }
    }
  } catch (err) {
    warning = `캡처 일부 실패: ${(err as Error).message}`;
  } finally {
    await browser.close().catch(() => {});
  }

  if (shots.length === 0) {
    throw new Error("랜딩 캡처에 실패했습니다.");
  }

  return { url, pageTitle, mode: "chromium", shots, warning };
}

/** 모드에 따라 캡처를 수행하고, 실패 시 단계적으로 폴백한다. */
export async function captureSite(url: string): Promise<CaptureResult> {
  const mode = (process.env.CAPTURE_MODE || "screenshot-api").toLowerCase();

  if (mode === "mock") return mockCapture(url);

  if (mode === "chromium") {
    // chromium → 실패 시 screenshot-api → 실패 시 mock
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

  // 기본: screenshot-api → 실패 시 mock
  try {
    return await screenshotApiCapture(url);
  } catch (err) {
    return { ...mockCapture(url), warning: `스크린샷 API 실패 → mock: ${(err as Error).message}` };
  }
}
