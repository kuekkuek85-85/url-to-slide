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
  titleScript:
    "안녕하세요. 오늘은 제가 수업에 활용해 본 ‘오개념 찾기 — 선사시대’라는 형성평가 도구를 소개해 드리겠습니다. 학생들이 직접 숨은 오개념을 찾아내는 점이 인상적이었어요.",
  outroScript:
    "이렇게 ‘오개념 찾기’는 학생의 능동적 사고와 즉각적인 교정을 함께 잡아 주는 도구였습니다. AI가 만든 초안을 교사가 검토해 완성했으니, 우리 반에 맞게 조금만 다듬어 활용하시면 좋겠습니다. 감사합니다.",
  sections: [
    {
      key: "functional",
      label: "기능적 특징",
      accent: "#ff5fa2",
      img: null,
      bullets: SAMPLE_ANALYSIS.functional,
      script:
        "먼저 기능을 보면, 학번과 이름만으로 간편하게 들어가 시대별 색상 카드로 진술을 분류하고, 숨은 오개념 다섯 개를 클릭으로 찾습니다. 찾은 개수와 걸린 시간이 실시간으로 표시돼 몰입도가 높습니다.",
    },
    {
      key: "educational",
      label: "교육적 특징",
      accent: "#9b6dff",
      img: null,
      bullets: SAMPLE_ANALYSIS.educational,
      script:
        "교육적으로는 ‘오류 찾기’ 방식이라 학생이 스스로 비판적으로 따져 보게 됩니다. 틀린 부분엔 바로 서술형 피드백이 주어지고, 재도전이 가능해 메타인지를 자연스럽게 키워 줍니다.",
    },
    {
      key: "effects",
      label: "기대효과",
      accent: "#ff9f43",
      img: null,
      bullets: SAMPLE_ANALYSIS.expectedEffects,
      script:
        "그래서 기대효과로는, 핵심 오개념을 그 자리에서 바로잡고 학급 전체의 오개념 분포까지 파악할 수 있습니다. 학생 흥미는 올라가고, 교사의 채점·해설 부담은 줄어듭니다.",
    },
    {
      key: "suggestions",
      label: "제안 · 개선점",
      accent: "#1fc8a9",
      img: null,
      bullets: SAMPLE_ANALYSIS.suggestions,
      script:
        "끝으로 제안입니다. 문항별 집계를 보여 주는 교사 대시보드와 세특 연계, 진술 셔플, 그리고 키보드·스크린리더 같은 접근성 보완이 더해진다면 활용도가 한층 높아질 것 같습니다.",
    },
  ],
};
