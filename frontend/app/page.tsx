"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useSession } from "next-auth/react";
import { PetalWind } from "@/components/PetalWind";
import { Navigation } from "@/components/sections/Navigation";
import { ScrollLogo } from "@/components/ScrollLogo";
import { IntroOverlay } from "@/components/IntroOverlay";
import { Hero } from "@/components/sections/Hero";
import { AhaMoment } from "@/components/sections/AhaMoment";
import { Architecture } from "@/components/sections/Architecture";
import { FeatureBento } from "@/components/sections/FeatureBento";
import { Footer } from "@/components/sections/Footer";

const INTRO_KEY = "sakhi-intro-played";

export default function Home() {
  const reduce = useReducedMotion();
  const { status } = useSession();
  const [playIntro, setPlayIntro] = useState(false);
  const [introDone, setIntroDone] = useState(true);

  // Play intro ONLY on first entry/open of application; skip when returning via back button
  useEffect(() => {
    try {
      const hasPlayed = sessionStorage.getItem(INTRO_KEY);
      if (hasPlayed === "true" || reduce) {
        setIntroDone(true);
        setPlayIntro(false);
      } else {
        setIntroDone(false);
        setPlayIntro(true);
      }
    } catch (e) {
      setIntroDone(true);
      setPlayIntro(false);
    }
  }, [reduce]);

  const handleIntroComplete = () => {
    try {
      sessionStorage.setItem(INTRO_KEY, "true");
    } catch (e) {}
    setIntroDone(true);
    setPlayIntro(false);
  };

  return (
    <>
      {playIntro && <IntroOverlay onComplete={handleIntroComplete} />}

      <ScrollLogo />
      {/* Continuous petal-wind background, fixed behind everything */}
      <PetalWind />

      <Navigation />

      {/* Main content stays in the DOM (for SEO/accessibility) but is hidden
          until the intro settles, then reveals without overlapping the intro. */}
      <main
        id="main"
        className={`relative transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          introDone
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        <section id="hero">
          <Hero />
        </section>
        <section id="cycle">
          <AhaMoment />
        </section>
        <section id="care">
          <Architecture />
        </section>
        <section id="mind">
          <FeatureBento />
        </section>
        <section id="privacy">
          <Footer />
        </section>
      </main>
    </>
  );
}
