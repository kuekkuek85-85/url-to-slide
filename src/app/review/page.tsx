"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Deck, Shot, AudiencePreset } from "@/lib/types";
import { getDraft, setDeck as setHandoffDeck, clearDraft } from "@/lib/handoff";

const AUDIENCES: { key: AudiencePreset; label: string; hint: string }[] = [
  { key: "peer", label: "동료교사", hint: "교수학습 가치 중심" },
  { key: "parent", label: "학부모", hint: "쉬운 말, 기대효과 강조" },
  { key: "admin", label: "관리자", hint: "운영·성과 중심" },
];

export default function ReviewPage() {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [audience, setAudience] = useState<AudiencePreset>("peer");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const data = getDraft();
    if (!data) {
      router.replace("/");
      return;
    }
    setDeck(data.deck);
    setShots(data.shots ?? []);
    const w: string[] = [];
    const cmode = data.capture?.mode;
    if (cmode && cmode !== "chromium") {
      w.push(
        `캡처 모드가 '${cmode}' 입니다 — 이 경우 보통 1컷만 생성됩니다. ` +
          `클릭·입력 다단계(최대 3컷) 캡처는 chromium 모드에서 동작합니다. ` +
          `(Vercel 환경변수 CAPTURE_MODE=chromium 확인, 또는 chromium 실행 실패로 폴백된 것일 수 있습니다.)`
      );
    }
    if (data.capture?.warning) w.push(data.capture.warning);
    if (data.analysis?.warning) w.push(data.analysis.warning);
    if (data.images?.warning) w.push(data.images.warning);
    if (data.narration?.warning) w.push(data.narration.warning);
    if (data.analysis?.mode === "stub")
      w.push("AI 분석이 샘플로 대체되었습니다. 원고를 직접 검토·수정하세요.");
    setWarnings(w);
  }, [router]);

  if (!deck) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center text-[#a3678a]">
        불러오는 중…
      </main>
    );
  }

  const update = (fn: (d: Deck) => Deck) => setDeck((d) => (d ? fn(structuredClone(d)) : d));

  const setBullet = (si: number, bi: number, value: string) =>
    update((d) => {
      d.sections[si].bullets[bi] = value;
      return d;
    });
  const addBullet = (si: number) =>
    update((d) => {
      d.sections[si].bullets.push("");
      return d;
    });
  const removeBullet = (si: number, bi: number) =>
    update((d) => {
      d.sections[si].bullets.splice(bi, 1);
      return d;
    });
  const assignImg = (si: number, src: string | null) =>
    update((d) => {
      d.sections[si].img = src;
      return d;
    });

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      setShots((s) => [...s, { label: "upload", src, title: file.name }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeShot = (src: string) => {
    setShots((s) => s.filter((x) => x.src !== src));
    update((d) => {
      d.sections.forEach((sec) => {
        if (sec.img === src) sec.img = null;
      });
      if (d.thumbnail === src) d.thumbnail = null;
      return d;
    });
  };

  function publish() {
    if (!deck) return;
    setError(null);
    // 서버/DB 저장 없이 메모리(+가능하면 sessionStorage)에 보관 → 휘발성 뷰어로 이동.
    setHandoffDeck(deck);
    clearDraft();
    router.push("/view");
  }

  return (
    <main className="font-cute mx-auto max-w-6xl px-5 py-10 text-[#5b2a45]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">검토 · 편집</h1>
          <p className="text-sm text-[#a3678a]">
            AI 초안을 확인하고 다듬으세요. 완료하면 슬라이드를 보고 PDF로 저장할 수 있습니다.
          </p>
        </div>
        <Link href="/" className="text-sm text-[#a3678a] hover:text-[#ff5fa2]">
          ← 처음으로
        </Link>
      </div>

      {warnings.length > 0 && (
        <div className="mb-6 space-y-1 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
        {/* 좌: 캡처 목록 */}
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">캡처 ({shots.length})</h2>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-[#ffc1de] px-3 py-1 text-xs hover:bg-[#fff0f5]"
            >
              + 업로드
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onUpload}
            />
          </div>
          {shots.length === 0 && (
            <p className="text-sm text-[#b58aa3]">캡처가 없습니다. 이미지를 업로드하세요.</p>
          )}
          {shots.map((s, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-[#ffd6e8] bg-white">
              <img src={s.src} alt={s.label} className="aspect-video w-full object-cover" />
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-[#a3678a]">{s.label}</span>
                <button onClick={() => removeShot(s.src)} className="text-red-500 hover:text-red-600">
                  삭제
                </button>
              </div>
            </div>
          ))}
        </aside>

        {/* 우: 메타 + 4카테고리 편집 */}
        <section className="space-y-6">
          {/* 청중 프리셋 */}
          <div>
            <label className="mb-2 block text-sm text-[#a3678a]">청중 톤 (프리셋)</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAudience(a.key)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    audience === a.key
                      ? "bg-[#ff5fa2] text-white"
                      : "border border-[#ffc1de] text-[#6b3a57] hover:bg-[#fff0f5]"
                  }`}
                  title={a.hint}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-[#a3678a]">앱 이름</label>
              <input
                value={deck.appName}
                onChange={(e) => update((d) => ((d.appName = e.target.value), d))}
                className="w-full rounded-lg border border-[#ffc1de] bg-white px-3 py-2 outline-none focus:border-[#ff5fa2]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#a3678a]">URL</label>
              <input
                value={deck.url}
                onChange={(e) => update((d) => ((d.url = e.target.value), d))}
                className="w-full rounded-lg border border-[#ffc1de] bg-white px-3 py-2 outline-none focus:border-[#ff5fa2]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#a3678a]">한 줄 소개</label>
            <input
              value={deck.oneLiner}
              onChange={(e) => update((d) => ((d.oneLiner = e.target.value), d))}
              className="w-full rounded-lg border border-[#ffc1de] bg-white px-3 py-2 outline-none focus:border-[#ff5fa2]"
            />
          </div>

          {deck.sections.map((sec, si) => (
            <div
              key={sec.key}
              className="rounded-2xl border border-[#ffd6e8] p-4"
              style={{ borderLeftColor: sec.accent, borderLeftWidth: 4 }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {sec.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sec.img}
                      alt={`${sec.label} 이미지`}
                      className="h-12 w-20 rounded-md border border-[#ffd6e8] object-cover"
                    />
                  ) : (
                    <div
                      className="h-12 w-20 rounded-md border border-[#ffd6e8]"
                      style={{ background: sec.accent, opacity: 0.25 }}
                    />
                  )}
                  <h3 className="font-semibold" style={{ color: sec.accent }}>
                    {sec.label}
                  </h3>
                </div>
                <select
                  value={sec.img ?? ""}
                  onChange={(e) => assignImg(si, e.target.value || null)}
                  className="rounded-lg border border-[#ffc1de] bg-white px-2 py-1 text-xs"
                >
                  {sec.img && !shots.some((s) => s.src === sec.img) && (
                    <option value={sec.img}>생성된 이미지</option>
                  )}
                  <option value="">이미지 없음</option>
                  {shots.map((s, i) => (
                    <option key={i} value={s.src}>
                      {s.label} #{i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {sec.bullets.map((b, bi) => (
                  <div key={bi} className="flex items-start gap-2">
                    <textarea
                      value={b}
                      rows={1}
                      onChange={(e) => setBullet(si, bi, e.target.value)}
                      className="min-h-[38px] flex-1 resize-y rounded-lg border border-[#ffc1de] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff5fa2]"
                    />
                    <button
                      onClick={() => removeBullet(si, bi)}
                      className="mt-1 px-2 text-[#b58aa3] hover:text-red-300"
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addBullet(si)}
                  className="text-sm text-[#a3678a] hover:text-[#ff5fa2]"
                >
                  + 항목 추가
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border-2 border-[#ffb3c8] bg-[#fff0f5] px-4 py-3 text-sm text-[#c2406a]">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 mt-8 flex justify-end gap-3 border-t border-[#ffd6e8] bg-white/90 py-4 backdrop-blur">
        <Link
          href="/"
          className="rounded-xl border border-[#ffc1de] px-5 py-2.5 text-sm hover:bg-[#fff0f5]"
        >
          취소
        </Link>
        <button
          onClick={publish}
          className="rounded-full bg-[#ff5fa2] px-7 py-2.5 font-bold text-white shadow-[0_8px_20px_rgba(255,95,162,0.45)] hover:brightness-105 disabled:opacity-50"
        >
          ✨ 슬라이드 보기 →
        </button>
      </div>
    </main>
  );
}
