import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CaptureResult, GeminiAnalysis } from "./types";
import { SAMPLE_ANALYSIS } from "./sample";

const SYSTEM_INSTRUCTION = `당신은 한국 교실의 수업평가 웹 도구를 분석해 소개 슬라이드 원고를 만드는 전문가입니다.
규칙:
- 캡처 화면과 추출 텍스트에서 "확인되는 근거만" 사용합니다. 추측·과장은 절대 금지합니다.
- 각 항목은 한국어 한 문장(또는 짧은 구)으로 간결하게 씁니다.
- 출력은 아래 JSON "만" 반환합니다. 마크다운, 코드펜스(\`\`\`), 설명 문장을 포함하지 마세요.

카테고리 정의:
- functional(기능적 특징): 관찰되는 입력·인터랙션·표시·결과 기능. 3~6개.
- educational(교육적 특징): 평가 유형(형성/총괄), 피드백 방식, 능동성, 성취기준 연계 등 교수학습 가치. 3~6개.
- expectedEffects(기대효과): 학생/교사 측 학습·운영 효과. 3~5개.
- suggestions(제안): 접근성·데이터 수집·확장·정합성 개선점. 3~5개.

반환 JSON 스키마:
{"appName":"string","oneLiner":"한 문장","functional":["..."],"educational":["..."],"expectedEffects":["..."],"suggestions":["..."]}`;

/** data URL("data:image/png;base64,....") → { mimeType, data } */
function parseDataUrl(src: string): { mimeType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(src);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

/** 코드펜스 제거 + 첫 JSON 오브젝트 추출 */
function extractJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
}

function coerceAnalysis(obj: any, fallbackName: string): GeminiAnalysis {
  const arr = (v: any): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  return {
    appName: typeof obj.appName === "string" && obj.appName ? obj.appName : fallbackName,
    oneLiner: typeof obj.oneLiner === "string" ? obj.oneLiner : "",
    functional: arr(obj.functional),
    educational: arr(obj.educational),
    expectedEffects: arr(obj.expectedEffects),
    suggestions: arr(obj.suggestions),
  };
}

export interface AnalyzeOutput {
  analysis: GeminiAnalysis;
  mode: "gemini" | "stub";
  warning?: string;
}

/**
 * 캡처(이미지+텍스트) → 4카테고리 분석.
 * 키가 없거나 호출이 실패하면 샘플 분석으로 폴백한다.
 */
export async function analyzeCapture(capture: CaptureResult): Promise<AnalyzeOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallbackName = capture.pageTitle || "수업평가 도구";

  if (!apiKey) {
    return {
      analysis: { ...SAMPLE_ANALYSIS, appName: fallbackName },
      mode: "stub",
      warning: "GEMINI_API_KEY 가 없어 샘플 분석으로 대체했습니다.",
    };
  }

  const textContext = [
    `대상 URL: ${capture.url}`,
    `페이지 제목: ${capture.pageTitle}`,
    "",
    "컷별 추출 정보:",
    ...capture.shots.map(
      (s, i) =>
        `#${i + 1} [${s.label}]${s.title ? ` 제목/버튼: ${s.title}` : ""}\n${
          s.text ? s.text.slice(0, 1500) : "(텍스트 없음)"
        }`
    ),
  ].join("\n");

  // Gemini 가 지원하는 이미지 MIME 만 전송한다(예: SVG 미지원).
  // 지원되지 않는 컷은 제외하고 텍스트 근거로 분석한다.
  const SUPPORTED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];
  const imageParts = capture.shots
    .map((s) => parseDataUrl(s.src))
    .filter((x): x is { mimeType: string; data: string } => !!x)
    .filter((d) => SUPPORTED.includes(d.mimeType.toLowerCase()))
    .slice(0, 5)
    .map((d) => ({ inlineData: { mimeType: d.mimeType, data: d.data } }));

  async function callOnce(): Promise<GeminiAnalysis> {
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    });
    const result = await model.generateContent([
      { text: textContext },
      ...imageParts,
      { text: "위 화면 근거만으로 JSON 을 반환하세요." },
    ]);
    const raw = result.response.text();
    const parsed = JSON.parse(extractJson(raw));
    return coerceAnalysis(parsed, fallbackName);
  }

  try {
    return { analysis: await callOnce(), mode: "gemini" };
  } catch (err) {
    // PRD §7: 실패 시 1회 재시도
    try {
      return { analysis: await callOnce(), mode: "gemini" };
    } catch (err2) {
      return {
        analysis: { ...SAMPLE_ANALYSIS, appName: fallbackName },
        mode: "stub",
        warning: `Gemini 분석 실패로 샘플 분석으로 대체했습니다: ${
          (err2 as Error).message
        }`,
      };
    }
  }
}
