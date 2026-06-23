import type { Deck, GeminiAnalysis } from "./types";

// PRD 부록 A — "오개념 찾기 — 선사시대" 워크드 예시.
// Gemini 키가 없거나 분석이 실패할 때 폴백으로 사용하고,
// /deck/demo 데모 페이지에서도 사용한다.

export const SAMPLE_ANALYSIS: GeminiAnalysis = {
  appName: "오개념 찾기 — 선사시대",
  oneLiner:
    "선사시대 15개 진술 중 숨은 오개념 5개를 찾아내는 오개념 진단형 형성평가 도구.",
  functional: [
    "무가입 간편 진입 (학번·이름만 입력)",
    "4개 시대 색상 카드로 진술 분류",
    "진술별 삽화 제공으로 이해 보조",
    "오개념 5개 찾기 클릭 인터랙션",
    "찾은 수·소요 시간·실수 실시간 표시",
    "결과 요약·오개념별 피드백·재도전 제공",
  ],
  educational: [
    "‘오류 찾기’형 능동 평가로 비판적 사고 자극",
    "즉각적인 서술형 피드백으로 오개념 교정",
    "게이미피케이션 요소로 학습 동기 부여",
    "재도전 구조로 메타인지 촉진",
    "assessment as learning(학습으로서의 평가) 구현",
  ],
  expectedEffects: [
    "핵심 오개념의 즉시 교정",
    "학급 단위 오개념 분포 파악",
    "흥미·참여·복습 효과 증대",
    "교사의 채점·해설 부담 경감",
  ],
  suggestions: [
    "교사 대시보드(문항별 집계 → 세특 연계)",
    "진술 셔플·문항 수 확대",
    "접근성 보완(키보드·스크린리더)",
    "오답에도 미니 해설 제공",
    "결과 공유·성취기준 매핑",
  ],
};

export const SAMPLE_DECK: Deck = {
  appName: SAMPLE_ANALYSIS.appName,
  url: "https://prehistory-quiz.lovable.app/",
  oneLiner: SAMPLE_ANALYSIS.oneLiner,
  thumbnail: null,
  sections: [
    {
      key: "functional",
      label: "기능적 특징",
      accent: "#3b82f6",
      img: null,
      bullets: SAMPLE_ANALYSIS.functional,
    },
    {
      key: "educational",
      label: "교육적 특징",
      accent: "#10b981",
      img: null,
      bullets: SAMPLE_ANALYSIS.educational,
    },
    {
      key: "effects",
      label: "기대효과",
      accent: "#f59e0b",
      img: null,
      bullets: SAMPLE_ANALYSIS.expectedEffects,
    },
    {
      key: "suggestions",
      label: "제안 · 개선점",
      accent: "#8b5cf6",
      img: null,
      bullets: SAMPLE_ANALYSIS.suggestions,
    },
  ],
};
