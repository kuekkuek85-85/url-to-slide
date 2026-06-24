"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SlideDeck from "@/components/SlideDeck";
import type { Deck } from "@/lib/types";
import { getDeck as getHandoffDeck } from "@/lib/handoff";

// 휘발성 뷰어: 서버/DB 저장 없이 브라우저(sessionStorage)의 deck 을 바로 보여준다.
// 새로고침으로 sessionStorage 가 남아 있으면 유지되고, 탭을 닫으면 사라진다.
export default function ViewPage() {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);

  useEffect(() => {
    const d = getHandoffDeck();
    if (!d) {
      router.replace("/");
      return;
    }
    setDeck(d);
  }, [router]);

  if (!deck) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center text-white/60">
        불러오는 중…
      </main>
    );
  }

  return (
    <>
      <div className="no-print font-cute fixed right-4 top-4 z-40 flex items-center gap-2">
        <Link
          href="/"
          className="rounded-full border-2 border-white bg-white/80 px-4 py-1.5 text-sm text-[#c06aa0] shadow backdrop-blur hover:bg-white"
        >
          홈
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-[#ff5fa2] px-4 py-1.5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(255,95,162,0.5)] hover:brightness-105"
          title="브라우저 인쇄로 PDF 저장 (Ctrl/⌘+P)"
        >
          ✨ PDF로 저장
        </button>
      </div>
      <SlideDeck deck={deck} />
    </>
  );
}
