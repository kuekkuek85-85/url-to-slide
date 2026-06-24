"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Deck } from "@/lib/types";

interface SlideDeckProps {
  deck: Deck;
}

type Slide =
  | { kind: "title" }
  | { kind: "section"; index: number }
  | { kind: "outro" };

// 섹션별 아기자기 이모지
const SECTION_EMOJI: Record<string, string> = {
  functional: "🎀",
  educational: "📚",
  effects: "🌟",
  suggestions: "💡",
};

// 러블리 파스텔 배경 그라데이션
const LOVELY_BG =
  "radial-gradient(1200px 600px at 12% 8%, #ffe3f1 0%, transparent 55%)," +
  "radial-gradient(1000px 700px at 88% 18%, #ece1ff 0%, transparent 55%)," +
  "radial-gradient(1100px 700px at 70% 95%, #d8fbf0 0%, transparent 55%)," +
  "linear-gradient(135deg, #fff1f8 0%, #f6edff 45%, #e9fbf6 100%)";

export default function SlideDeck({ deck }: SlideDeckProps) {
  const slides: Slide[] = useMemo(() => {
    const s: Slide[] = [{ kind: "title" }];
    deck.sections.forEach((_, i) => s.push({ kind: "section", index: i }));
    s.push({ kind: "outro" });
    return s;
  }, [deck]);

  const [current, setCurrent] = useState(0);
  const [showCaption, setShowCaption] = useState(true);
  const total = slides.length;

  const scriptFor = (slide: Slide): string => {
    if (slide.kind === "title") return deck.titleScript ?? "";
    if (slide.kind === "outro") return deck.outroScript ?? "";
    return deck.sections[slide.index].script ?? "";
  };
  const currentScript = scriptFor(slides[current]);
  const hasAnyScript =
    !!deck.titleScript ||
    !!deck.outroScript ||
    deck.sections.some((s) => !!s.script);

  const go = useCallback(
    (n: number) => setCurrent((c) => Math.max(0, Math.min(total - 1, n))),
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(current - 1);
      } else if (e.key === "Home") {
        go(0);
      } else if (e.key === "End") {
        go(total - 1);
      } else if (e.key === "c" || e.key === "C" || e.key === "ㅊ") {
        setShowCaption((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go, total]);

  const accent =
    slides[current].kind === "section"
      ? deck.sections[(slides[current] as { index: number }).index].accent
      : "#ff5fa2";

  return (
    <div
      className="slide-root font-cute relative min-h-[100dvh] w-full overflow-hidden text-[#5b2a45]"
      style={{ background: LOVELY_BG }}
    >
      <Sparkles />

      {/* 진행바 */}
      <div className="no-print fixed left-0 top-0 z-30 h-1.5 w-full bg-white/40">
        <div
          className="h-full rounded-r-full transition-all duration-300"
          style={{
            width: `${((current + 1) / total) * 100}%`,
            background:
              "linear-gradient(90deg,#ff8ec7,#c79bff,#ffd36e,#7ee8c9)",
          }}
        />
      </div>

      {/* 좌/우 클릭 영역 */}
      <button
        aria-label="이전 슬라이드"
        onClick={() => go(current - 1)}
        className="no-print absolute left-0 top-0 z-20 h-full w-1/4 cursor-w-resize focus:outline-none"
      />
      <button
        aria-label="다음 슬라이드"
        onClick={() => go(current + 1)}
        className="no-print absolute right-0 top-0 z-20 h-full w-1/4 cursor-e-resize focus:outline-none"
      />

      {/* 현재 슬라이드 (화면 표시용) */}
      <div className="no-print relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-16 md:px-16">
        <SlideView slide={slides[current]} deck={deck} />
      </div>

      {/* 발표 자막 */}
      {showCaption && currentScript && (
        <div className="no-print pointer-events-none fixed bottom-16 left-1/2 z-30 w-[min(92vw,52rem)] -translate-x-1/2 px-2">
          <p
            className="rounded-[1.75rem] border-2 border-white bg-white/85 px-6 py-4 text-center text-base font-medium leading-relaxed text-[#5b2a45] shadow-[0_10px_30px_rgba(255,143,199,0.35)] backdrop-blur md:text-xl"
            style={{ borderBottom: `4px solid ${accent}` }}
          >
            <span className="mr-1">💬</span>
            {currentScript}
          </p>
        </div>
      )}

      {/* 하단 도트 내비 + 카운터 + 자막 토글 */}
      <div className="no-print fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-white bg-white/70 px-4 py-2 shadow-[0_8px_24px_rgba(199,155,255,0.35)] backdrop-blur">
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={i}
              aria-label={`${i + 1}번 슬라이드로`}
              onClick={() => go(i)}
              className="h-3 w-3 rounded-full transition-all"
              style={{
                background: i === current ? accent : "rgba(91,42,69,0.18)",
                transform: i === current ? "scale(1.35)" : "scale(1)",
                boxShadow: i === current ? `0 0 10px ${accent}` : "none",
              }}
            />
          ))}
        </div>
        <span className="ml-1 text-sm tabular-nums text-[#a3678a]">
          {current + 1} / {total}
        </span>
        {hasAnyScript && (
          <button
            onClick={() => setShowCaption((v) => !v)}
            className={`ml-1 rounded-full px-3 py-1 text-xs font-bold transition ${
              showCaption
                ? "bg-[#ff5fa2] text-white shadow"
                : "bg-white/60 text-[#a3678a] hover:bg-white"
            }`}
            title="발표 자막 켜기/끄기 (C)"
          >
            자막 {showCaption ? "ON" : "OFF"}
          </button>
        )}
      </div>

      {/* 인쇄(PDF 저장)용 — 모든 슬라이드를 페이지 분할로 렌더 */}
      <div className="print-deck hidden">
        {slides.map((s, i) => (
          <div
            key={i}
            className="print-slide hidden items-center justify-center px-16"
            style={{ background: LOVELY_BG, color: "#5b2a45" }}
          >
            <SlideView slide={s} deck={deck} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* 떠다니는 반짝이 장식 (화면 전용) */
function Sparkles() {
  const items = [
    { e: "✨", top: "10%", left: "8%", d: "0s", s: "text-4xl" },
    { e: "💖", top: "20%", left: "90%", d: "0.6s", s: "text-3xl" },
    { e: "⭐", top: "75%", left: "6%", d: "1.1s", s: "text-3xl" },
    { e: "🌸", top: "85%", left: "92%", d: "0.3s", s: "text-4xl" },
    { e: "✨", top: "45%", left: "95%", d: "1.4s", s: "text-2xl" },
    { e: "💫", top: "60%", left: "3%", d: "0.9s", s: "text-3xl" },
    { e: "🩷", top: "8%", left: "55%", d: "1.7s", s: "text-2xl" },
  ];
  return (
    <div className="no-print pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {items.map((it, i) => (
        <span
          key={i}
          className={`animate-floaty absolute ${it.s}`}
          style={{ top: it.top, left: it.left }}
        >
          <span
            className="animate-twinkle inline-block"
            style={{ animationDelay: it.d }}
          >
            {it.e}
          </span>
        </span>
      ))}
    </div>
  );
}

function SlideView({ slide, deck }: { slide: Slide; deck: Deck }) {
  if (slide.kind === "title") return <TitleSlide deck={deck} />;
  if (slide.kind === "outro") return <OutroSlide deck={deck} />;
  return <SectionSlide section={deck.sections[slide.index]} />;
}

function TitleSlide({ deck }: { deck: Deck }) {
  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {deck.sections.map((s) => (
          <span
            key={s.key}
            className="h-3 w-8 rounded-full"
            style={{ background: s.accent, boxShadow: `0 2px 8px ${s.accent}66` }}
          />
        ))}
      </div>
      <p className="text-lg text-[#c06aa0]">˚୨୧ 수업평가 도구 소개 ୨୧˚</p>
      <h1 className="bling-text text-5xl font-normal leading-tight drop-shadow-sm md:text-7xl">
        {deck.appName}
      </h1>
      {deck.oneLiner && (
        <p className="max-w-3xl text-lg text-[#6b3a57] md:text-2xl">
          {deck.oneLiner}
        </p>
      )}
      <a
        href={deck.url}
        target="_blank"
        rel="noreferrer"
        className="break-all rounded-full border-2 border-white bg-white/70 px-4 py-1.5 text-sm text-[#c06aa0] shadow hover:bg-white md:text-base"
      >
        🔗 {deck.url}
      </a>
      {deck.thumbnail && (
        <div className="relative mt-3">
          <span className="absolute -left-4 -top-4 text-3xl">✨</span>
          <span className="absolute -bottom-3 -right-3 text-3xl">💖</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={deck.thumbnail}
            alt="메인 화면"
            className="max-h-[40vh] rounded-[1.75rem] border-4 border-white object-contain shadow-[0_16px_40px_rgba(255,143,199,0.4)]"
          />
        </div>
      )}
    </div>
  );
}

function SectionSlide({ section }: { section: Deck["sections"][number] }) {
  const emoji = SECTION_EMOJI[section.key] ?? "💗";
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2">
      <div className="order-2 md:order-1">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-white px-5 py-1.5 text-sm font-bold shadow"
          style={{ background: `${section.accent}22`, color: section.accent }}
        >
          <span className="text-lg">{emoji}</span>
          {section.label}
        </div>
        <h2
          className="mb-6 text-4xl font-normal md:text-5xl"
          style={{ color: section.accent }}
        >
          {section.label}
        </h2>
        <ul className="space-y-3">
          {section.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-2xl border-2 border-white/70 bg-white/60 px-4 py-2.5 text-base text-[#5b2a45] shadow-sm md:text-xl"
            >
              <span
                className="mt-0.5 flex-shrink-0 text-lg"
                style={{ color: section.accent }}
              >
                ♥
              </span>
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 md:order-2">
        <div className="relative">
          <span className="absolute -left-3 -top-3 z-10 text-3xl">✨</span>
          {section.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={section.img}
              alt={`${section.label} 이미지`}
              className="w-full rounded-[1.75rem] border-4 border-white object-contain shadow-[0_16px_40px_rgba(199,155,255,0.4)]"
            />
          ) : (
            <div
              className="flex aspect-video w-full items-center justify-center rounded-[1.75rem] border-4 border-white text-5xl shadow-[0_16px_40px_rgba(199,155,255,0.3)]"
              style={{ background: `${section.accent}1a` }}
            >
              {emoji}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OutroSlide({ deck }: { deck: Deck }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
      <div className="text-5xl">💕 ✨ 🎀</div>
      <h2 className="bling-text text-4xl font-normal md:text-6xl">
        {deck.appName}
      </h2>
      {deck.oneLiner && (
        <p className="text-lg text-[#6b3a57] md:text-2xl">{deck.oneLiner}</p>
      )}
      <div className="mt-2 rounded-[1.75rem] border-2 border-white bg-white/70 px-8 py-6 shadow-[0_12px_32px_rgba(255,143,199,0.35)]">
        <p className="text-base text-[#6b3a57] md:text-lg">
          🧑‍🏫 <strong className="text-[#ff5fa2]">Teacher in the Loop</strong>
        </p>
        <p className="mt-2 text-sm text-[#8a5a74] md:text-base">
          AI 초안 → 교사 검토 → 슬라이드 발표 원칙으로 만들어졌어요 ♡
        </p>
      </div>
      <p className="text-lg text-[#c06aa0]">들어주셔서 감사합니다 ୨୧</p>
    </div>
  );
}
