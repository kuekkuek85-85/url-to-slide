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

export default function SlideDeck({ deck }: SlideDeckProps) {
  const slides: Slide[] = useMemo(() => {
    const s: Slide[] = [{ kind: "title" }];
    deck.sections.forEach((_, i) => s.push({ kind: "section", index: i }));
    s.push({ kind: "outro" });
    return s;
  }, [deck]);

  const [current, setCurrent] = useState(0);
  const total = slides.length;

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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go, total]);

  const accent =
    slides[current].kind === "section"
      ? deck.sections[(slides[current] as { index: number }).index].accent
      : "#6366f1";

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0b1020] text-[#e9ecf5]">
      {/* 진행바 (PRD §6.2) */}
      <div className="no-print fixed left-0 top-0 z-30 h-1 w-full bg-white/10">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${((current + 1) / total) * 100}%`, background: accent }}
        />
      </div>

      {/* 좌/우 클릭 영역 (PRD §6.2) */}
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
      <div className="no-print flex min-h-[100dvh] items-center justify-center px-6 py-16 md:px-16">
        <SlideView slide={slides[current]} deck={deck} />
      </div>

      {/* 하단 도트 내비 + 페이지 카운터 (PRD §6.2) */}
      <div className="no-print fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={i}
              aria-label={`${i + 1}번 슬라이드로`}
              onClick={() => go(i)}
              className="h-2.5 w-2.5 rounded-full transition-all"
              style={{
                background: i === current ? accent : "rgba(255,255,255,0.25)",
                transform: i === current ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>
        <span className="ml-2 text-sm tabular-nums text-white/50">
          {current + 1} / {total}
        </span>
      </div>

      {/* 인쇄(PDF 저장)용 — 모든 슬라이드를 페이지 분할로 렌더 (PRD §6.2) */}
      <div className="print-deck hidden">
        {slides.map((s, i) => (
          <div
            key={i}
            className="print-slide hidden items-center justify-center bg-[#0b1020] px-16"
          >
            <SlideView slide={s} deck={deck} />
          </div>
        ))}
      </div>
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
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {deck.sections.map((s) => (
          <span
            key={s.key}
            className="h-2 w-10 rounded-full"
            style={{ background: s.accent }}
          />
        ))}
      </div>
      <h1 className="text-4xl font-bold leading-tight md:text-6xl">{deck.appName}</h1>
      {deck.oneLiner && (
        <p className="max-w-3xl text-lg text-white/70 md:text-2xl">{deck.oneLiner}</p>
      )}
      <a
        href={deck.url}
        target="_blank"
        rel="noreferrer"
        className="break-all text-sm text-indigo-300 underline-offset-2 hover:underline md:text-base"
      >
        {deck.url}
      </a>
      {deck.thumbnail && (
        <img
          src={deck.thumbnail}
          alt="랜딩 썸네일"
          className="mt-4 max-h-[42vh] rounded-xl border border-white/10 object-contain shadow-2xl"
        />
      )}
    </div>
  );
}

function SectionSlide({ section }: { section: Deck["sections"][number] }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2">
      <div className="order-2 md:order-1">
        <div
          className="mb-4 inline-block rounded-full px-4 py-1 text-sm font-semibold"
          style={{ background: `${section.accent}22`, color: section.accent }}
        >
          {section.label}
        </div>
        <h2 className="mb-6 text-3xl font-bold md:text-4xl">{section.label}</h2>
        <ul className="space-y-3">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-base md:text-xl">
              <span
                className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: section.accent }}
              />
              <span
                className="leading-relaxed"
                style={
                  section.key === "suggestions"
                    ? { color: section.accent, fontWeight: 500 }
                    : undefined
                }
              >
                {b}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 md:order-2">
        {section.img ? (
          <img
            src={section.img}
            alt={`${section.label} 화면 캡처`}
            className="w-full rounded-xl border border-white/10 object-contain shadow-2xl"
            style={{ borderColor: `${section.accent}55` }}
          />
        ) : (
          <div
            className="flex aspect-video w-full items-center justify-center rounded-xl border text-sm text-white/40"
            style={{ borderColor: `${section.accent}55`, background: `${section.accent}11` }}
          >
            (캡처 없음)
          </div>
        )}
      </div>
    </div>
  );
}

function OutroSlide({ deck }: { deck: Deck }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
      <h2 className="text-3xl font-bold md:text-5xl">{deck.appName}</h2>
      {deck.oneLiner && <p className="text-lg text-white/70 md:text-2xl">{deck.oneLiner}</p>}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-8 py-6">
        <p className="text-base text-white/80 md:text-lg">
          🧑‍🏫 <strong>Teacher in the Loop</strong>
        </p>
        <p className="mt-2 text-sm text-white/60 md:text-base">
          AI 초안 → 교사 검토·확정 → 슬라이드 게시 원칙으로 만들어졌습니다.
        </p>
      </div>
    </div>
  );
}
