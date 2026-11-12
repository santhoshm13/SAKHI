"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Global smooth-scrolling provider powered by Lenis.
 * - Uses GPU-friendly interpolated wheel smoothing (autoRaf)
 * - Allows nested scrollable regions (chat boxes, modals, drawers)
 * - Respects prefers-reduced-motion automatically
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      autoRaf: true,
      anchors: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      respectReducedMotion: true,
      prevent: (node) =>
        Boolean(node.closest('[role="dialog"], [data-lenis-prevent]')),
    });

    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    lenisRef.current?.resize();
  }, [pathname]);

  return null;
}

