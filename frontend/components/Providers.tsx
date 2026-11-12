"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { SmoothScroll } from "@/components/SmoothScroll";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SmoothScroll />
      {children}
    </SessionProvider>
  );
}
