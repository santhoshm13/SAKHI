"use client";
import React, { useEffect } from "react";
import { Sparkle } from "@phosphor-icons/react";

/** The Sakhi doll with a mouth layer driven by the voice (word boundaries). */
export default function SakhiDoll({ mouthOpen, talking, status }: { mouthOpen: boolean; talking: boolean; status?: string }) {
  // Preload both frames so the mouth never flickers
  useEffect(() => {
    ["/sakhi-doll.png", "/sakhi-doll-open.png"].forEach(src => { const i = new window.Image(); i.src = src; });
  }, []);

  return (
    <div className="w-full md:w-1/3 flex flex-col items-center justify-center relative">
      <div className={`relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-4 sm:border-8 border-white bg-pink-50 select-none transition-shadow duration-300 ${talking ? "shadow-[0_10px_50px_rgba(244,114,182,0.5)]" : "shadow-[0_10px_40px_rgba(244,114,182,0.3)]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sakhi-doll.png" alt="Sakhi" loading="eager" decoding="sync" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sakhi-doll-open.png" alt="" aria-hidden loading="eager" decoding="sync"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-75 ${mouthOpen ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      <div className="mt-3 sm:mt-5 md:mt-6 flex items-center gap-2">
        <Sparkle weight="duotone" className="text-pink-500 w-5 h-5 sm:w-6 sm:h-6" />
        <h3 className="text-plum-900 font-semibold text-xl sm:text-2xl tracking-tight">Sakhi</h3>
      </div>
      {status && <p className="mt-1 text-xs text-plum-900/55" aria-live="polite">{status}</p>}
    </div>
  );
}
