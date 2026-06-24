import { NextRequest, NextResponse } from "next/server";
import { captureSite } from "@/lib/capture";
import { analyzeCapture, generateSectionImages, generateNarration } from "@/lib/gemini";
import { buildDeck, sectionImageInputs } from "@/lib/deck";
import { normalizeUrl } from "@/lib/url";
import type { GenerateResponse } from "@/lib/types";

// Playwright 는 Node.js 런타임 필수 (Edge 불가) — PRD §4
export const runtime = "nodejs";
export const maxDuration = 60; // 캡처 + 분석 합산 시간 확보 (PRD §4, §10)

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const url = normalizeUrl(body.url ?? "");
  if (!url) {
    return NextResponse.json(
      { error: "유효한 HTTPS URL 을 입력하세요." },
      { status: 400 }
    );
  }

  try {
    // 1) 캡처 (Playwright/@sparticuz/chromium → 폴백)
    const capture = await captureSite(url);

    // 2) 분석 (Gemini → 폴백)
    const { analysis, mode: analysisMode, warning: analysisWarning } =
      await analyzeCapture(capture);

    // 3) 섹션 이미지 + 발표 자막 생성 (모두 Gemini, 병렬)
    const [imgOut, narrOut] = await Promise.all([
      generateSectionImages(analysis.appName, sectionImageInputs(analysis)),
      generateNarration(analysis, url),
    ]);

    // 4) deck JSON 매핑 (스크린샷=표지, 생성 이미지=섹션, 자막 부착)
    const deck = buildDeck(analysis, url, capture.shots, imgOut.images, narrOut.narration);

    const payload: GenerateResponse = {
      deck,
      shots: capture.shots,
      capture: {
        mode: capture.mode,
        pageTitle: capture.pageTitle,
        warning: capture.warning,
      },
      analysis: { mode: analysisMode, warning: analysisWarning },
      images: { mode: imgOut.mode, warning: imgOut.warning },
      narration: { warning: narrOut.warning },
    };
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: `슬라이드 생성 실패: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
