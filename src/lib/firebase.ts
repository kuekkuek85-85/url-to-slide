import type { App } from "firebase-admin/app";

// Firebase Admin 을 지연 초기화한다. 환경변수가 없으면 null 을 반환하고
// 호출 측은 인메모리 폴백으로 동작한다 (PRD §3: Firebase 없이도 동작 가능).

let cachedApp: App | null | undefined;

function loadServiceAccount():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key,
      };
    } catch {
      return null;
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

export async function getFirebaseApp(): Promise<App | null> {
  if (cachedApp !== undefined) return cachedApp;

  const creds = loadServiceAccount();
  if (!creds) {
    cachedApp = null;
    return null;
  }

  const { getApps, initializeApp, cert } = await import("firebase-admin/app");
  const existing = getApps();
  cachedApp =
    existing.length > 0
      ? existing[0]
      : initializeApp({
          credential: cert({
            projectId: creds.projectId,
            clientEmail: creds.clientEmail,
            privateKey: creds.privateKey,
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
  return cachedApp;
}

export function isFirebaseConfigured(): boolean {
  return loadServiceAccount() !== null;
}
