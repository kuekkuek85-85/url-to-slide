"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GenerateResponse } from "@/lib/types";

const STEPS = ["URL 확인 중", "화면 캡처 중", "AI 분석 중", "원고 정리 중"];

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

      // 검토 화면으로 결과 전달 (sessionStorage)
      sessionStorage.setItem("t2s:draft", JSON.stringify(data));
      router.push("/review");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="mb-2 flex items-center gap-2">
        {["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"].map((c) => (
          <span key={c} className="h-2 w-10 rounded-full" style={{ background: c }} />
        ))}
      </div>
      <h1 className="text-center text-4xl font-bold md:text-5xl">Tool2Slides</h1>
      <p className="mt-3 text-center text-white/70 md:text-lg">
        수업평가 웹 앱의 URL을 넣으면, 그 앱을 설명하는 슬라이드를 자동 생성합니다.
      </p>
      <p className="mt-1 text-center text-sm text-white/40">
        기능적 특징 · 교육적 특징 · 기대효과 · 제안 — 4개 섹션
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
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base outline-none placeholder:text-white/30 focus:border-indigo-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "생성 중…" : "슬라이드 만들기"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="mt-8 w-full max-w-md">
          <div className="flex justify-between text-sm text-white/60">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? "text-indigo-300" : ""}>
                {i <= step ? "●" : "○"} {s}
              </span>
            ))}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-indigo-400 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-white/40">
            캡처 + 분석에 최대 60초가 걸릴 수 있습니다.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-10 flex gap-4 text-sm text-white/50">
        <Link href="/deck/demo" className="hover:text-white">
          데모 슬라이드 보기 →
        </Link>
        <Link href="/decks" className="hover:text-white">
          내 슬라이드
        </Link>
      </div>

      <p className="mt-12 max-w-xl text-center text-xs text-white/30">
        ⚠️ 더미값으로만 캡처합니다. 실제 학생 데이터를 입력하는 도구의 URL은 피하고,
        본인이 권한을 가진 도구만 캡처하세요.
      </p>
    </main>
  );
}
