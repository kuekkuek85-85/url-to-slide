import { notFound } from "next/navigation";
import { headers } from "next/headers";
import SlideDeck from "@/components/SlideDeck";
import ShareBar from "@/components/ShareBar";
import { getDeck } from "@/lib/store";
import { SAMPLE_DECK } from "@/lib/sample";
import type { Deck } from "@/lib/types";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export default async function DeckPage({ params }: { params: { id: string } }) {
  let deck: Deck | null = null;

  if (params.id === "demo") {
    deck = SAMPLE_DECK;
  } else {
    const doc = await getDeck(params.id);
    deck = doc?.deck ?? null;
  }

  if (!deck) notFound();

  const shareUrl = `${baseUrl()}/deck/${params.id}`;

  return (
    <>
      <ShareBar shareUrl={shareUrl} />
      <SlideDeck deck={deck} />
    </>
  );
}
