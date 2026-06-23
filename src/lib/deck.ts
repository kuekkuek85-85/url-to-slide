import type { Deck, DeckSection, GeminiAnalysis, Shot } from "./types";

// 섹션별 accent 색상 (PRD §6.2)
const ACCENTS = {
  functional: "#3b82f6", // 파랑
  educational: "#10b981", // 초록
  effects: "#f59e0b", // 주황
  suggestions: "#8b5cf6", // 보라
} as const;

const LABELS = {
  functional: "기능적 특징",
  educational: "교육적 특징",
  effects: "기대효과",
  suggestions: "제안 · 개선점",
} as const;

/**
 * 캡처 컷을 섹션별로 배정한다.
 * - 기능 = 평가/인터랙션 화면, 교육 = 피드백 화면, 기대효과 = 결과 화면.
 * - 적당한 컷이 없으면 가능한 컷을 순서대로 채운다.
 */
function pickImages(shots: Shot[]): Record<string, string | null> {
  const byLabel = (kw: string[]) =>
    shots.find((s) =>
      kw.some((k) => (s.label + " " + (s.title ?? "")).toLowerCase().includes(k))
    )?.src ?? null;

  const landing = shots[0]?.src ?? null;
  const interaction =
    byLabel(["interaction", "quiz", "input", "평가", "문제"]) ??
    shots[1]?.src ??
    landing;
  const feedback =
    byLabel(["feedback", "피드백", "해설", "정답"]) ?? shots[2]?.src ?? interaction;
  const result =
    byLabel(["result", "결과", "요약", "score", "점수"]) ??
    shots[shots.length - 1]?.src ??
    feedback;

  return {
    functional: interaction,
    educational: feedback,
    effects: result,
    suggestions: null, // 제안 슬라이드는 캡처 없이 강조 색만 (PRD §6.1)
  };
}

/**
 * Gemini 분석 결과 + 캡처 → deck JSON (PRD §6.3).
 * Gemini 출력 JSON 을 deck 에 그대로 주입하고 accent/img 를 부착한다.
 */
export function buildDeck(
  analysis: GeminiAnalysis,
  url: string,
  shots: Shot[]
): Deck {
  const images = pickImages(shots);

  const sections: DeckSection[] = [
    {
      key: "functional",
      label: LABELS.functional,
      accent: ACCENTS.functional,
      img: images.functional,
      bullets: analysis.functional ?? [],
    },
    {
      key: "educational",
      label: LABELS.educational,
      accent: ACCENTS.educational,
      img: images.educational,
      bullets: analysis.educational ?? [],
    },
    {
      key: "effects",
      label: LABELS.effects,
      accent: ACCENTS.effects,
      img: images.effects,
      bullets: analysis.expectedEffects ?? [],
    },
    {
      key: "suggestions",
      label: LABELS.suggestions,
      accent: ACCENTS.suggestions,
      img: images.suggestions,
      bullets: analysis.suggestions ?? [],
    },
  ];

  return {
    appName: analysis.appName || "제목 미상 앱",
    url,
    oneLiner: analysis.oneLiner || "",
    thumbnail: shots[0]?.src ?? null,
    sections,
  };
}

/** deck JSON 기본 검증 — 슬라이드 렌더 전에 형태를 보장한다. */
export function isValidDeck(value: unknown): value is Deck {
  if (!value || typeof value !== "object") return false;
  const d = value as Deck;
  return (
    typeof d.appName === "string" &&
    typeof d.url === "string" &&
    Array.isArray(d.sections)
  );
}
