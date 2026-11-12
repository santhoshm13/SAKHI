"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { SmoothScroll } from "@/components/SmoothScroll";
import DiscreetGuard from "@/components/DiscreetGuard";
import OutboxSync from "@/components/OutboxSync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SmoothScroll />
      {children}
      <DiscreetGuard />
      <OutboxSync />
    </SessionProvider>
  );
}
