import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "틈",
  description: "팀원 시간표로 공강을 찾아 회의 시간을 정해요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
