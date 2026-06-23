import { nanoid } from "nanoid";
import type { Deck, DeckDoc } from "./types";
import { getFirebaseApp, isFirebaseConfigured } from "./firebase";

const COLLECTION = "decks";

// ───────────────────────────────────────────────────────────
// 인메모리 폴백 (Firebase 미설정 시).
// 서버리스 콜드스타트 시 초기화되지만 단일 인스턴스/개발에서는 동작한다.
// ───────────────────────────────────────────────────────────
const memory = new Map<string, DeckDoc>();

/** data URL 이미지를 Storage 에 업로드하고 공개 URL 로 치환한다. */
async function persistImages(deckId: string, deck: Deck): Promise<string[]> {
  const app = await getFirebaseApp();
  if (!app || !process.env.FIREBASE_STORAGE_BUCKET) return [];

  const { getStorage } = await import("firebase-admin/storage");
  const bucket = getStorage(app).bucket();
  const paths: string[] = [];

  const uploadDataUrl = async (dataUrl: string, name: string): Promise<string | null> => {
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const [, mime, b64] = m;
    const ext = mime.split("/")[1]?.split("+")[0] || "jpg";
    const path = `decks/${deckId}/${name}.${ext}`;
    const file = bucket.file(path);
    await file.save(Buffer.from(b64, "base64"), {
      contentType: mime,
      metadata: { cacheControl: "public, max-age=31536000" },
    });
    await file.makePublic().catch(() => {});
    paths.push(path);
    return `https://storage.googleapis.com/${bucket.name}/${path}`;
  };

  if (deck.thumbnail?.startsWith("data:")) {
    const url = await uploadDataUrl(deck.thumbnail, "thumbnail");
    if (url) deck.thumbnail = url;
  }
  for (let i = 0; i < deck.sections.length; i++) {
    const s = deck.sections[i];
    if (s.img?.startsWith("data:")) {
      const url = await uploadDataUrl(s.img, `shot_${s.key}`);
      if (url) s.img = url;
    }
  }
  return paths;
}

export async function createDeck(
  deck: Deck,
  opts: { uid?: string | null; sourceUrl: string } = { sourceUrl: "" }
): Promise<DeckDoc> {
  const id = nanoid(10);
  const now = Date.now();

  // 이미지 업로드(가능하면) → deck 내 img 가 https URL 로 치환됨
  const shotPaths = await persistImages(id, deck);

  const doc: DeckDoc = {
    id,
    uid: opts.uid ?? null,
    sourceUrl: opts.sourceUrl || deck.url,
    deck,
    shotPaths,
    shareId: id, // MVP: 생성 즉시 공개 공유 가능
    createdAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured()) {
    const app = await getFirebaseApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    await getFirestore(app!).collection(COLLECTION).doc(id).set(doc);
  } else {
    memory.set(id, doc);
  }
  return doc;
}

export async function getDeck(id: string): Promise<DeckDoc | null> {
  if (isFirebaseConfigured()) {
    const app = await getFirebaseApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    const snap = await getFirestore(app!).collection(COLLECTION).doc(id).get();
    return snap.exists ? (snap.data() as DeckDoc) : null;
  }
  return memory.get(id) ?? null;
}

export async function listDecks(uid?: string | null): Promise<DeckDoc[]> {
  if (isFirebaseConfigured()) {
    const app = await getFirebaseApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    let q = getFirestore(app!).collection(COLLECTION).orderBy("createdAt", "desc").limit(100);
    const snap = await q.get();
    let docs = snap.docs.map((d) => d.data() as DeckDoc);
    if (uid) docs = docs.filter((d) => d.uid === uid);
    return docs;
  }
  const all = Array.from(memory.values()).sort((a, b) => b.createdAt - a.createdAt);
  return uid ? all.filter((d) => d.uid === uid) : all;
}

export async function updateDeck(id: string, deck: Deck): Promise<DeckDoc | null> {
  const existing = await getDeck(id);
  if (!existing) return null;
  const updated: DeckDoc = { ...existing, deck, updatedAt: Date.now() };

  if (isFirebaseConfigured()) {
    const app = await getFirebaseApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    await getFirestore(app!)
      .collection(COLLECTION)
      .doc(id)
      .set({ deck, updatedAt: updated.updatedAt }, { merge: true });
  } else {
    memory.set(id, updated);
  }
  return updated;
}

export async function deleteDeck(id: string): Promise<boolean> {
  if (isFirebaseConfigured()) {
    const app = await getFirebaseApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    await getFirestore(app!).collection(COLLECTION).doc(id).delete();
    return true;
  }
  return memory.delete(id);
}
