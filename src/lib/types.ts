// ───────────────────────────────────────────────────────────
// Tool2Slides 공용 타입
// ───────────────────────────────────────────────────────────

/** Gemini 가 반환하는 원본 분석 결과 (PRD §7) */
export interface GeminiAnalysis {
  appName: string;
  oneLiner: string;
  functional: string[];
  educational: string[];
  expectedEffects: string[];
  suggestions: string[];
}

/** 슬라이드 한 섹션 (PRD §6.3) */
export interface DeckSection {
  key: "functional" | "educational" | "effects" | "suggestions";
  label: string;
  accent: string;
  img: string | null;
  bullets: string[];
  /** 발표 자막(이 슬라이드 대본) */
  script?: string;
}

/** 슬라이드 사이트에 주입되는 deck JSON (PRD §6.3) */
export interface Deck {
  appName: string;
  url: string;
  oneLiner: string;
  thumbnail?: string | null;
  sections: DeckSection[];
  /** 표지 슬라이드 발표 자막 */
  titleScript?: string;
  /** 마무리 슬라이드 발표 자막 */
  outroScript?: string;
}

/** 발표 대본 (슬라이드별, 3분 이내) */
export interface Narration {
  title: string;
  functional: string;
  educational: string;
  effects: string;
  suggestions: string;
  outro: string;
}

/** Playwright(또는 폴백)로 캡처한 한 컷 */
export interface Shot {
  /** 캡처 단계 라벨: landing / interaction / result 등 */
  label: string;
  /** data URL 또는 저장된 https URL */
  src: string;
  /** 컷에서 추출한 텍스트 (분석 보조) */
  text?: string;
  /** 컷에서 관찰된 버튼/제목 */
  title?: string;
}

/** 캡처 결과 전체 */
export interface CaptureResult {
  url: string;
  pageTitle: string;
  shots: Shot[];
  /** 캡처에 사용한 모드 (chromium / screenshot-api / mock) */
  mode: string;
  /** 실패 시 사용자에게 보여줄 경고 */
  warning?: string;
}

/** Firestore 에 저장되는 deck 문서 (PRD §8) */
export interface DeckDoc {
  id: string;
  uid: string | null;
  sourceUrl: string;
  deck: Deck;
  shotPaths: string[];
  shareId: string | null;
  createdAt: number;
  updatedAt: number;
}

/** 청중 프리셋 (PRD §9-2) */
export type AudiencePreset = "peer" | "parent" | "admin";

/** /api/generate 응답 */
export interface GenerateResponse {
  deck: Deck;
  shots: Shot[];
  capture: { mode: string; pageTitle: string; warning?: string };
  analysis: { mode: "gemini" | "stub"; warning?: string };
  images: { mode: "gemini-image" | "none"; warning?: string };
  narration: { warning?: string };
}
