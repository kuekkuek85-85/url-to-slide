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

// ───────────────────────────────────────────────────────────
// 섹션 이미지 생성 (Gemini 이미지 모델)
// 메인 페이지는 실제 스크린샷, 나머지 섹션은 내용에 맞는 일러스트를 생성한다.
// ───────────────────────────────────────────────────────────

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export interface SectionImageInput {
  key: string;
  label: string;
  accent: string;
  theme: string;
  bullets: string[];
}

export interface ImageGenOutput {
  images: Record<string, string | null>; // key → data URL
  mode: "gemini-image" | "none";
  warning?: string;
}

function imagePrompt(appName: string, s: SectionImageInput): string {
  const ctx = s.bullets.slice(0, 4).join("; ");
  return [
    `한국 교실 수업평가 웹 도구 "${appName}" 소개 슬라이드용 일러스트레이션.`,
    `주제: ${s.label} — ${s.theme}.`,
    ctx ? `참고 내용: ${ctx}.` : "",
    `스타일: 모던 플랫 벡터 일러스트, 깔끔하고 미니멀, ${s.accent} 계열 색을 중심으로 한 부드러운 배색,`,
    `어두운 남색(#0b1020) 배경과 잘 어울리는 톤, 16:9 가로 구도, 여백 충분히.`,
    `매우 중요: 그림 안에 글자/문자/숫자/단어/로고를 절대 넣지 마세요 (no text, no words, no letters, no numbers).`,
  ]
    .filter(Boolean)
    .join(" ");
}

async function generateOneImage(apiKey: string, prompt: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );
  if (!res.ok) throw new Error(`이미지 생성 오류 ${res.status}`);
  const json: any = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    if (p?.inlineData?.data) {
      const mime = p.inlineData.mimeType || "image/png";
      return `data:${mime};base64,${p.inlineData.data}`;
    }
  }
  return null;
}

/**
 * 각 섹션에 맞는 이미지를 병렬 생성한다.
 * 키가 없거나 전부 실패하면 mode: "none" 으로 폴백(섹션은 색상 블록으로 렌더).
 */
export async function generateSectionImages(
  appName: string,
  sections: SectionImageInput[]
): Promise<ImageGenOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  const empty: Record<string, string | null> = {};
  sections.forEach((s) => (empty[s.key] = null));

  if (!apiKey) {
    return {
      images: empty,
      mode: "none",
      warning: "GEMINI_API_KEY 가 없어 섹션 이미지를 생성하지 않았습니다.",
    };
  }

  const results = await Promise.all(
    sections.map(async (s) => {
      try {
        return [s.key, await generateOneImage(apiKey, imagePrompt(appName, s))] as const;
      } catch {
        return [s.key, null] as const;
      }
    })
  );

  const images: Record<string, string | null> = {};
  let ok = 0;
  for (const [k, v] of results) {
    images[k] = v;
    if (v) ok++;
  }

  return {
    images,
    mode: ok > 0 ? "gemini-image" : "none",
    warning:
      ok === 0
        ? "섹션 이미지 생성에 실패했습니다(색상 블록으로 표시)."
        : ok < sections.length
        ? `일부 섹션 이미지 생성 실패 (${ok}/${sections.length}).`
        : undefined,
  };
}
