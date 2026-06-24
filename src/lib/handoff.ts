import type { Deck, GenerateResponse } from "./types";

// 페이지 간(홈→검토→뷰) 데이터 전달.
// 캡처 이미지(base64)가 커서 sessionStorage 용량(~5MB)을 넘기 쉬우므로,
// 1순위는 모듈 메모리(클라이언트 SPA 네비게이션 동안 유지),
// 2순위는 sessionStorage(작을 때만 성공 → 새로고침 생존)로 둔다.

const DRAFT_KEY = "t2s:draft";
const DECK_KEY = "t2s:deck";

let memDraft: GenerateResponse | null = null;
let memDeck: Deck | null = null;

function safeSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // 용량 초과 등 — 메모리에만 보관하고 조용히 무시한다.
  }
}
function safeGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function safeRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function setDraft(data: GenerateResponse) {
  memDraft = data;
  safeSet(DRAFT_KEY, JSON.stringify(data));
}
export function getDraft(): GenerateResponse | null {
  return memDraft ?? safeGet<GenerateResponse>(DRAFT_KEY);
}
export function clearDraft() {
  memDraft = null;
  safeRemove(DRAFT_KEY);
}

export function setDeck(deck: Deck) {
  memDeck = deck;
  // deck 저장 전에 draft 슬롯을 비워 sessionStorage 여유를 확보한다.
  safeRemove(DRAFT_KEY);
  safeSet(DECK_KEY, JSON.stringify(deck));
}
export function getDeck(): Deck | null {
  return memDeck ?? safeGet<Deck>(DECK_KEY);
}
export function clearDeck() {
  memDeck = null;
  safeRemove(DECK_KEY);
}
