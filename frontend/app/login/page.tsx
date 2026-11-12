import { Suspense } from "react";
import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = {
  title: "Sign in — Sakhi",
  description: "Sign in to your private Sakhi workspace with email and password or Google.",
};

export default function LoginPage() {
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

