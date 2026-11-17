"use client";

import Link from "next/link";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import { LinkProvider } from "@astryxdesign/core/Link";
import koKR from "@astryxdesign/core/locales/ko-KR.generated.js";
import { Theme } from "@astryxdesign/core/theme";

import { defaultThemeSlug, themes } from "@/astryx-themes";

// 테마, 한국어 문구(닫기·불러오는 중 등 컴포넌트 기본 문구), 내부 링크 연결
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <InternationalizationProvider locale="ko-KR" messages={{ "ko-KR": koKR }}>
      <Theme theme={themes[defaultThemeSlug]}>
        <LinkProvider component={Link}>{children}</LinkProvider>
      </Theme>
    </InternationalizationProvider>
  );
}
