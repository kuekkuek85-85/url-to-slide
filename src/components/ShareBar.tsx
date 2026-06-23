"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";

export default function ShareBar({ shareUrl }: { shareUrl: string }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 불가 시 무시 */
    }
  };

  return (
    <div className="no-print fixed right-4 top-4 z-40 flex items-center gap-2">
      <Link
        href="/"
        className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white/80 backdrop-blur hover:bg-white/10"
      >
        홈
      </Link>
      <button
        onClick={copy}
        className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white/80 backdrop-blur hover:bg-white/10"
      >
        {copied ? "복사됨!" : "링크 복사"}
      </button>
      <button
        onClick={() => setShowQr((v) => !v)}
        className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white/80 backdrop-blur hover:bg-white/10"
      >
        QR
      </button>
      <button
        onClick={() => window.print()}
        className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white/80 backdrop-blur hover:bg-white/10"
        title="브라우저 인쇄로 PDF 저장 (Ctrl/⌘+P)"
      >
        PDF 저장
      </button>

      {showQr && (
        <div className="absolute right-0 top-12 rounded-xl border border-white/15 bg-white p-3 shadow-2xl">
          <QRCodeCanvas value={shareUrl} size={160} />
          <p className="mt-2 max-w-[160px] break-all text-center text-[10px] text-black/60">
            {shareUrl}
          </p>
        </div>
      )}
    </div>
  );
}
