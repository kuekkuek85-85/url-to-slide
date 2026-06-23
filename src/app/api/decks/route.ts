import { NextRequest, NextResponse } from "next/server";
import { createDeck, listDecks } from "@/lib/store";
import { isValidDeck } from "@/lib/deck";

export const runtime = "nodejs";

// 목록 조회 (PRD §9-4 내 슬라이드)
export async function GET() {
  try {
    const docs = await listDecks();
    return NextResponse.json({
      decks: docs.map((d) => ({
        id: d.id,
        appName: d.deck.appName,
        url: d.deck.url,
        oneLiner: d.deck.oneLiner,
        thumbnail: d.deck.thumbnail ?? null,
        shareId: d.shareId,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// 확정된 deck 저장 → 공유 링크 생성 (PRD §5-5 게시)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  if (!isValidDeck(body?.deck)) {
    return NextResponse.json({ error: "유효한 deck 데이터가 아닙니다." }, { status: 400 });
  }

  try {
    const doc = await createDeck(body.deck, {
      uid: body.uid ?? null,
      sourceUrl: body.sourceUrl || body.deck.url,
    });
    return NextResponse.json({ id: doc.id, shareId: doc.shareId, deck: doc.deck });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
