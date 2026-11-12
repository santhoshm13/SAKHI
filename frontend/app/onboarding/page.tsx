"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UnifiedOnboardingChat from "@/components/UnifiedOnboardingChat";
import AuthScreen from "@/components/auth/AuthScreen";
import { Heartbeat } from "@phosphor-icons/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileLoading, setProfileLoading] = useState(true);

  // Check if they already have a profile cookie
  useEffect(() => {
    if (status === "authenticated") {
      const checkProfile = async () => {
        try {
          const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const isSwitch = urlParams?.get('switch') === 'true';
          if (isSwitch) {
            setProfileLoading(false);
            return;
          }

          if (!session?.user?.email) {
            setProfileLoading(false);
            return;
          }

          const me = await fetch("/api/me", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null);
          const hasMomProfile = Boolean(me?.hasMomProfile);
          const hasHerProfile = Boolean(me?.hasHerProfile);
          const activeMode = localStorage.getItem("sakhi_active_mode") || (document.cookie.split(";").find(c => c.trim().startsWith("sakhi_active_mode="))?.split("=")[1]?.trim());

          if (activeMode === "pregnancy" && hasMomProfile) {
            router.push("/pregnancy-mode");
            return;
          }
          if (activeMode === "her" && hasHerProfile) {
            router.push("/her-mode");
            return;
          }
          if (hasMomProfile) {
            router.push("/pregnancy-mode");
          } else if (hasHerProfile) {
            router.push("/her-mode");
          } else {
            setProfileLoading(false);
          }
        } catch (e) {
          setProfileLoading(false);
        }
      };
      
      checkProfile();
    }
  }, [status]);

  if (status === "loading" || (status === "authenticated" && profileLoading)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-lavender-500 border-t-transparent" />
          <p className="text-sm font-medium text-plum-800">Checking profile...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-[100dvh] items-center justify-center bg-cream">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-lavender-500 border-t-transparent" />
          </div>
        }
      >
        <AuthScreen initialTab="signin" />
      </Suspense>
    );
  }

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12 bg-cream">
      {/* Breathing Orbs for depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="breathe absolute -top-20 left-[10%] h-80 w-80 rounded-full bg-lavender-200/40 blur-3xl" />
        <div className="breathe absolute bottom-10 right-[10%] h-80 w-80 rounded-full bg-blush-200/40 blur-3xl" style={{ animationDelay: "3s" }} />
      </div>

      <div className="w-full max-w-2xl text-center mb-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white ring-1 ring-lavender-200/50 shadow-sm">
          <Heartbeat size={36} weight="fill" className="text-lavender-500" />
        </div>
        <h2 className="text-[2rem] font-semibold leading-tight tracking-tight text-plum-950">
          Welcome to <span className="display-serif text-plum-800 italic">Sakhi</span>
        </h2>
        <p className="mt-3 text-sm text-ink-soft">Let's set up your personalized health companion.</p>
      </div>

      <div className="w-full max-w-2xl px-2">
        <UnifiedOnboardingChat />
      </div>
    </section>
  );
}
