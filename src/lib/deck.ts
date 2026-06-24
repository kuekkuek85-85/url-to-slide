import type { Deck, DeckSection, GeminiAnalysis, Narration, Shot } from "./types";

// 섹션 정의 (PRD §6.2) — accent 색상 + 분석 필드 + 이미지 생성용 주제.
export const SECTION_DEFS = [
  {
    key: "functional" as const,
    label: "기능적 특징",
    accent: "#3b82f6", // 파랑
    field: "functional" as const,
    theme: "핵심 기능과 인터랙션(입력, 버튼, 결과 표시)을 상징하는 추상적 장면",
  },
  {
    key: "educational" as const,
    label: "교육적 특징",
    accent: "#10b981", // 초록
    field: "educational" as const,
    theme: "교육적 가치(형성평가, 피드백, 능동적 학습)를 상징하는 장면",
  },
  {
    key: "effects" as const,
    label: "기대효과",
    accent: "#f59e0b", // 주황
    field: "expectedEffects" as const,
    theme: "학습과 운영의 긍정적 기대효과(성장, 향상, 성취)를 상징하는 장면",
  },
  {
    key: "suggestions" as const,
    label: "제안 · 개선점",
    accent: "#8b5cf6", // 보라
    field: "suggestions" as const,
    theme: "개선과 확장 아이디어(접근성, 데이터 활용, 발전 방향)를 상징하는 장면",
  },
];

/** 이미지 생성 입력으로 쓸 섹션 메타 + 불릿을 만든다. */
export function sectionImageInputs(analysis: GeminiAnalysis) {
  return SECTION_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    accent: d.accent,
    theme: d.theme,
    bullets: (analysis[d.field] as string[]) ?? [],
  }));
}

/**
 * Gemini 분석 결과 + 메인 스크린샷 + 생성 이미지 → deck JSON (PRD §6.3).
 * - thumbnail/표지: 실제 메인 페이지 스크린샷(shots[0])
 * - 각 섹션 이미지: Gemini 가 생성한 일러스트(generated[key]). 없으면 null(색상 블록).
 */
export function buildDeck(
  analysis: GeminiAnalysis,
  url: string,
  shots: Shot[],
  generated?: Record<string, string | null>,
  narration?: Narration | null
): Deck {
  const g = generated ?? {};
  const n = narration ?? null;

  const sections: DeckSection[] = SECTION_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    accent: d.accent,
    img: g[d.key] ?? null,
    bullets: (analysis[d.field] as string[]) ?? [],
    script: n ? (n[d.key] as string) || undefined : undefined,
  }));

  return {
    appName: analysis.appName || "제목 미상 앱",
    url,
    oneLiner: analysis.oneLiner || "",
    thumbnail: shots[0]?.src ?? null,
    sections,
    titleScript: n?.title || undefined,
    outroScript: n?.outro || undefined,
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
