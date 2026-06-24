import { notFound } from "next/navigation";
import { headers } from "next/headers";
import SlideDeck from "@/components/SlideDeck";
import ShareBar from "@/components/ShareBar";
import { SAMPLE_DECK } from "@/lib/sample";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

// DB/서버 저장 없는 휘발성 구조에서, 이 라우트는 고정 데모 슬라이드만 제공한다.
// 사용자가 생성한 슬라이드는 /view (브라우저 sessionStorage) 에서 본다.
export default function DeckPage({ params }: { params: { id: string } }) {
  if (params.id !== "demo") notFound();

  const shareUrl = `${baseUrl()}/deck/demo`;

  return (
    <>
      <ShareBar shareUrl={shareUrl} />
      <SlideDeck deck={SAMPLE_DECK} />
    </>
  );
}
