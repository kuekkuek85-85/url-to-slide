"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DeckSummary {
  id: string;
  appName: string;
  url: string;
  oneLiner: string;
  thumbnail: string | null;
  shareId: string | null;
  createdAt: number;
}

export default function MyDecksPage() {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/decks");
    const data = await res.json();
    setDecks(data.decks ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("이 슬라이드를 삭제할까요?")) return;
    await fetch(`/api/decks/${id}`, { method: "DELETE" });
    setDecks((d) => d.filter((x) => x.id !== id));
  };

  const duplicate = async (id: string) => {
    const res = await fetch(`/api/decks/${id}`);
    const data = await res.json();
    if (!res.ok) return;
    await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deck: data.deck, sourceUrl: data.deck.url }),
    });
    load();
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 슬라이드</h1>
        <Link
          href="/"
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-400"
        >
          + 새로 만들기
        </Link>
      </div>

      {loading ? (
        <p className="text-white/50">불러오는 중…</p>
      ) : decks.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/50">
          아직 저장된 슬라이드가 없습니다.
          <div className="mt-3">
            <Link href="/" className="text-indigo-300 hover:underline">
              첫 슬라이드 만들기 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => (
            <div
              key={d.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              <Link href={`/deck/${d.id}`}>
                {d.thumbnail ? (
                  <img
                    src={d.thumbnail}
                    alt={d.appName}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-white/5 text-white/30">
                    미리보기 없음
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-semibold">{d.appName}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-white/50">{d.oneLiner}</p>
                <div className="mt-3 flex gap-3 text-sm">
                  <Link href={`/deck/${d.id}`} className="text-indigo-300 hover:underline">
                    열기
                  </Link>
                  <button onClick={() => duplicate(d.id)} className="text-white/60 hover:text-white">
                    복제
                  </button>
                  <button onClick={() => remove(d.id)} className="text-red-300 hover:text-red-200">
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
