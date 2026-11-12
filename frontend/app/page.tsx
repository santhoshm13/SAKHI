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
import { Modes } from "@/components/sections/Modes";
import { TalkToSakhi } from "@/components/sections/TalkToSakhi";
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
        <section id="hero" aria-label="Introduction">
          <Hero />
        </section>
        <section id="modes" aria-label="Her Mode and Mom Mode" className="scroll-mt-20">
          <Modes />
        </section>
        <section id="insights" aria-label="Cycle and mood insights" className="scroll-mt-20">
          <AhaMoment />
        </section>
        <section id="talk" aria-label="Talk to Sakhi" className="scroll-mt-20">
          <TalkToSakhi />
        </section>
        <section id="privacy" aria-label="Privacy" className="scroll-mt-20">
          <Footer />
        </section>
      </main>
    </>
  );
}
