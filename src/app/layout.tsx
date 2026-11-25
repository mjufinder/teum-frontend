import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans-kr/400.css";
import "@fontsource/ibm-plex-sans-kr/500.css";
import "@fontsource/ibm-plex-sans-kr/700.css";
import "./globals.css";

import SiteFooter from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "틈",
  description: "팀원 시간표로 공강을 찾아 회의 시간을 정해요",
};

// 페인트 전에 저장된 테마를 적용해 깜빡임(FOUC)을 막는다. 기본값은 다크.
const themeScript = `(function(){try{var t=localStorage.theme;if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-ink-base">
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
