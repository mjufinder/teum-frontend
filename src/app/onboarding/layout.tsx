"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { VStack } from "@astryxdesign/core/VStack";

import AppFrame from "@/components/layout/AppFrame";
import { PageLoading } from "@/components/layout/PageState";
import { supabase } from "@/lib/supabase";

const steps = [
  { href: "/onboarding/profile", label: "프로필" },
  { href: "/onboarding/timetable", label: "시간표" },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setReady(true);
      } else {
        router.replace("/login");
      }
    }

    check();
    return () => {
      cancelled = true;
      // 숨겨진 라우트의 상태가 유지되므로 다음에 가입한 사용자에게 이전 입력값이 보이지 않게 비운다.
      setReady(false);
    };
  }, [router]);

  const activeStep = Math.max(
    0,
    steps.findIndex((step) => step.href === pathname)
  );

  return (
    <AppFrame hasNav={false} homeHref="/onboarding/profile">
      <VStack gap={8}>
        <div className="max-w-[420px]">
          <Stepper activeStep={activeStep} label="가입 단계">
            {steps.map((step, index) => (
              <Step key={step.href} step={index} label={step.label} />
            ))}
          </Stepper>
        </div>
        {ready ? children : <PageLoading />}
      </VStack>
    </AppFrame>
  );
}
