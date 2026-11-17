import Link from "next/link";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import Logo from "@/components/layout/Logo";

interface AuthFrameProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// 로그인·회원가입처럼 메뉴 없이 한 가지 일만 하는 화면의 틀
export default function AuthFrame({ title, description, children, footer }: AuthFrameProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5 py-12">
      <Link href="/" aria-label="틈 처음 화면" className="self-start">
        <Logo />
      </Link>
      <Card padding={6} elevation="low">
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={1}>{title}</Heading>
            <Text color="secondary">{description}</Text>
          </VStack>
          {children}
        </VStack>
      </Card>
      {footer}
    </main>
  );
}
