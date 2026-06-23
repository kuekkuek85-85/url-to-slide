import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tool2Slides — 수업평가 도구 소개 슬라이드 생성기",
  description:
    "수업평가 웹 앱의 URL을 넣으면, 그 앱을 설명하는 웹 기반 슬라이드를 자동 생성합니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
