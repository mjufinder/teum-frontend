// globals.css 가 캐스케이드 레이어 순서를 정하므로 다른 스타일보다 먼저 불러온다.
import "./globals.css";
import "@fontsource/ibm-plex-sans-kr/400.css";
import "@fontsource/ibm-plex-sans-kr/500.css";
import "@fontsource/ibm-plex-sans-kr/700.css";

import type { Metadata } from "next";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "틈",
  description: "팀원 시간표로 공강을 찾아 회의 시간을 정해요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
