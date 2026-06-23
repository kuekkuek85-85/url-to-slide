import { NextRequest, NextResponse } from "next/server";
import { getDeck, updateDeck, deleteDeck } from "@/lib/store";
import { isValidDeck } from "@/lib/deck";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const doc = await getDeck(params.id);
  if (!doc) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ id: doc.id, shareId: doc.shareId, deck: doc.deck });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  if (!isValidDeck(body?.deck)) {
    return NextResponse.json({ error: "유효한 deck 데이터가 아닙니다." }, { status: 400 });
  }
  const updated = await updateDeck(params.id, body.deck);
  if (!updated) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ id: updated.id, deck: updated.deck });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ok = await deleteDeck(params.id);
  if (!ok) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
