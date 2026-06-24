"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GenerateResponse } from "@/lib/types";
import { setDraft } from "@/lib/handoff";

const STEPS = ["URL 확인 중", "메인 화면 캡처 중", "AI 분석 중", "슬라이드 이미지 생성 중"];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStep(0);

    // 진행 표시(대략) — 실제 단계는 서버에서 한 번에 처리된다.
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as GenerateResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "생성에 실패했습니다.");

      // 검토 화면으로 결과 전달 (메모리 우선 + sessionStorage 보조)
      setDraft(data);
      router.push("/review");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <main className="font-cute mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-[#5b2a45]">
      <div className="mb-3 flex items-center gap-2">
        {["#ff5fa2", "#9b6dff", "#ff9f43", "#1fc8a9"].map((c) => (
          <span
            key={c}
            className="h-3 w-9 rounded-full"
            style={{ background: c, boxShadow: `0 2px 8px ${c}66` }}
          />
        ))}
      </div>
      <h1 className="bling-text text-center text-5xl font-normal md:text-6xl">
        Tool2Slides
      </h1>
      <p className="mt-3 text-center text-[#6b3a57] md:text-lg">
        수업평가 웹 앱의 URL을 넣으면, 그 앱을 설명하는 슬라이드를 자동 생성합니다 ✨
      </p>
      <p className="mt-1 text-center text-sm text-[#a3678a]">
        기능적 특징 · 교육적 특징 · 기대효과 · 제안 — 4개 섹션 🎀
      </p>

      <form onSubmit={handleSubmit} className="mt-10 w-full">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            inputMode="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-2xl border-2 border-[#ffc1de] bg-white px-4 py-3 text-base text-[#5b2a45] shadow-[0_6px_18px_rgba(255,143,199,0.2)] outline-none placeholder:text-[#caa6bb] focus:border-[#ff5fa2] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="rounded-2xl bg-[#ff5fa2] px-6 py-3 font-bold text-white shadow-[0_8px_20px_rgba(255,95,162,0.45)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "생성 중…" : "슬라이드 만들기"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="mt-8 w-full max-w-md">
          <div className="flex justify-between text-sm text-[#a3678a]">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? "font-bold text-[#ff5fa2]" : ""}>
                {i <= step ? "●" : "○"} {s}
              </span>
            ))}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((step + 1) / STEPS.length) * 100}%`,
                background: "linear-gradient(90deg,#ff8ec7,#c79bff,#7ee8c9)",
              }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-[#a3678a]">
            캡처 + 분석에 최대 60초가 걸릴 수 있어요 💫
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 w-full rounded-2xl border-2 border-[#ffb3c8] bg-[#fff0f5] px-4 py-3 text-sm text-[#c2406a]">
          {error}
        </div>
      )}

      <div className="mt-10 flex gap-4 text-sm">
        <Link
          href="/deck/demo"
          className="rounded-full border-2 border-white bg-white/70 px-4 py-1.5 text-[#c06aa0] shadow hover:bg-white"
        >
          데모 슬라이드 보기 →
        </Link>
      </div>

      <p className="mt-12 max-w-xl text-center text-xs text-[#b58aa3]">
        ⚠️ 더미값으로만 캡처합니다. 실제 학생 데이터를 입력하는 도구의 URL은 피하고,
        본인이 권한을 가진 도구만 캡처하세요.
      </p>
    </main>
  );
}
