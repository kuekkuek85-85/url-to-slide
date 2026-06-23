/** 입력 URL 정규화 + 검증 (PRD §5-1: HTTPS, 도달 가능성). */
export function normalizeUrl(input: string): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
