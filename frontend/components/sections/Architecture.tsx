"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { FlowerLotus, Lightning } from "@phosphor-icons/react";

/**
 * Architecture — The "Under the Hood" ML section, reimagined as an
 * interactive 3D spatial interface.
 *
 * A continuously rotating "Orchestration Core" (left) sits opposite four
 * holographic glassmorphism engine cards (right) that tilt on the X/Y axes
 * with the cursor (parallax). Hovering a card fires a glowing fiber-optic
 * strand (anime.js) from the card into the core and shifts the core's colour
 * matrix to that engine's accent.
 *
 * All motion honours prefers-reduced-motion.
 */

type Engine = {
  id: string;
  name: string;
  algo: string;
  desc: string;
  glow: string; // tailwind gradient classes for card glow + accent dot
  hex: string; // accent hex for the fiber-optic strand + core halo
};

const ENGINES: Engine[] = [
  {
    id: "pmdd",
    name: "PMDD / PME Engine",
    algo: "XGBoost · On-device",
    desc: "Correlates sleep, mood, and basal body temperature to predict severe luteal-phase drops.",
    glow: "from-lavender-300 to-lavender-500",
    hex: "#a982d6",
  },
  {
    id: "pcos",
    name: "PCOS Classifier",
    algo: "Random Forest",
    desc: "Predicts androgen-excess probability from cycle regularity and reported hirsutism.",
    glow: "from-blush-300 to-blush-500",
    hex: "#e2758d",
  },
  {
    id: "maternal",
    name: "Maternal & GDM Triage",
    algo: "ML Microservice · FastAPI",
    desc: "Evaluates blood pressure, fasting blood sugar, and symptoms to screen for Preeclampsia and Gestational Diabetes risk.",
    glow: "from-plum-700 to-blush-400",
    hex: "#764aa3",
  },
  {
    id: "thyroid",
    name: "Thyroid Risk",
    algo: "Logistic Regression",
    desc: "Detects hypothyroid weight flags and fatigue patterns from tracked symptoms.",
    glow: "from-lavender-200 to-lavender-400",
    hex: "#c3a3e4",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 26, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 60, damping: 20 },
  },
};

type Strand = { x1: number; y1: number; x2: number; y2: number; hex: string };

export function Architecture() {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [activeEngine, setActiveEngine] = useState<string | null>(null);
  const [strand, setStrand] = useState<Strand | null>(null);

  const active = ENGINES.find((e) => e.id === activeEngine) ?? null;

  const handleInspect = (e: MouseEvent<HTMLDivElement>, engine: Engine) => {
    setActiveEngine(engine.id);
    const panel = panelRef.current;
    const core = coreRef.current;
    const card = e.currentTarget;
    if (!panel || !core || !card) return;
    const pr = panel.getBoundingClientRect();
    const cr = core.getBoundingClientRect();
    const cdr = card.getBoundingClientRect();
    setStrand({
      x1: cdr.left + cdr.width / 2 - pr.left,
      y1: cdr.top + cdr.height / 2 - pr.top,
      x2: cr.left + cr.width / 2 - pr.left,
      y2: cr.top + cr.height / 2 - pr.top,
      hex: engine.hex,
    });
  };

  const handleLeave = () => {
    setActiveEngine(null);
    setStrand(null);
  };

  // anime.js draws the fiber-optic strand in from the card to the core.
  useEffect(() => {
    if (!strand || !pathRef.current || reduce) return;
    const path = pathRef.current;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    let anim: { pause?: () => void } | null = null;
    import("animejs").then((mod) => {
      const anime = ((mod as any).default || mod) as (opts: any) => any;
      anim = anime({
        targets: path,
        strokeDashoffset: [len, 0],
        duration: 650,
        easing: "easeOutQuad",
      });
    });
    return () => anim?.pause?.();
  }, [strand, reduce]);

  const strandPath = strand
    ? `M ${strand.x1} ${strand.y1} Q ${(strand.x1 + strand.x2) / 2} ${
        Math.min(strand.y1, strand.y2) - 60
      } ${strand.x2} ${strand.y2}`
    : "";

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-white to-lavender-50/30 px-4 py-32 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section heading (keeps the existing identity) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={container}
          className="mb-20 text-center"
        >
          <motion.div variants={item} className="mb-6 flex justify-center">
            <span className="rounded-full bg-black/5 px-4 py-1.5 text-xs font-medium text-plum-900">
              System architecture
            </span>
          </motion.div>
          <motion.h2
            variants={item}
            className="text-balance text-4xl font-semibold tracking-tight text-plum-950 sm:text-5xl lg:text-6xl"
          >
            Powered by localized{" "}
            <span className="display-serif text-plum-700 italic">
              Machine Learning
            </span>
            .
          </motion.h2>
          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-ink-soft"
          >
            Four independent diagnostic engines working in perfect unison. Your
            data stays on your device, processed locally for ultimate privacy.
          </motion.p>
        </motion.div>

        {/* 3D panel */}
        <div
          ref={panelRef}
          className="relative grid grid-cols-1 gap-8 lg:grid-cols-12"
        >
          {/* Fiber-optic strand overlay */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="strandGrad" x1="0" y1="0" x2="1" y2="1">
                <stop
                  offset="0%"
                  stopColor={strand?.hex ?? "#a982d6"}
                  stopOpacity="0.1"
                />
                <stop
                  offset="100%"
                  stopColor={strand?.hex ?? "#a982d6"}
                  stopOpacity="0.9"
                />
              </linearGradient>
            </defs>
            {strand && (
              <>
                <path
                  ref={pathRef}
                  d={strandPath}
                  fill="none"
                  stroke="url(#strandGrad)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <circle
                  cx={strand.x2}
                  cy={strand.y2}
                  r={5}
                  fill={strand.hex}
                  className={reduce ? "" : "animate-ping"}
                />
              </>
            )}
          </svg>

          {/* LEFT — Orchestration Core */}
          <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[2rem] border border-lavender-100 bg-gradient-to-b from-lavender-50/60 to-blush-50/30 p-8 lg:col-span-5">
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(#e8dff5 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />
            <Core active={active} reduce={reduce} coreRef={coreRef} />

            {/* Engine feed status */}
            <div className="relative z-10 mt-8 text-center">
              {active ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-lavender-100 bg-lavender-50 px-3 py-1 font-mono text-xs font-semibold text-lavender-600 shadow-sm"
                >
                  <Lightning size={12} weight="fill" />
                  {active.algo} · routing thread…
                </motion.div>
              ) : (
                <span className="font-mono text-xs text-ink-faint">
                  Hover an engine to inspect its thread
                </span>
              )}
            </div>
          </div>

          {/* RIGHT — Parallax engine cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            {ENGINES.map((engine) => (
              <ParallaxCard
                key={engine.id}
                engine={engine}
                reduce={!!reduce}
                onInspect={handleInspect}
                onLeave={handleLeave}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Core({
  active,
  reduce,
  coreRef,
}: {
  active: Engine | null;
  reduce: boolean | null;
  coreRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <motion.div
      ref={coreRef}
      animate={reduce ? undefined : { rotateY: 360, rotateX: [12, -12, 12] }}
      transition={
        reduce
          ? undefined
          : { repeat: Infinity, duration: 22, ease: "linear" }
      }
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      className="relative flex h-48 w-48 items-center justify-center"
    >
      {/* Concentric rings */}
      <div
        className="absolute inset-0 rounded-full border-2 border-dashed border-lavender-300/40 animate-spin"
        style={{ animationDuration: "40s" }}
      />
      <div
        className="absolute inset-4 rounded-full border border-blush-300/30 animate-spin"
        style={{ animationDuration: "15s", animationDirection: "reverse" }}
      />

      {/* Active colour halo (shifts the core's matrix) */}
      <motion.div
        className="absolute inset-8 rounded-full blur-xl"
        animate={{ opacity: active ? 0.55 : 0 }}
        transition={{ duration: 0.5 }}
        style={{ backgroundColor: active?.hex ?? "transparent" }}
      />

      {/* Central node */}
      <div className="relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full border border-lavender-100 bg-white shadow-[0_0_50px_rgba(195,163,228,0.6)]">
        <FlowerLotus size={36} weight="light" className="text-lavender-600" />
        <span className="mt-1 text-[11px] font-semibold text-lavender-600">
          Local
        </span>
      </div>
    </motion.div>
  );
}

function ParallaxCard({
  engine,
  reduce,
  onInspect,
  onLeave,
}: {
  engine: Engine;
  reduce: boolean;
  onInspect: (e: MouseEvent<HTMLDivElement>, engine: Engine) => void;
  onLeave: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-120, 120], [12, -12]);
  const rotateY = useTransform(x, [-120, 120], [-12, 10]);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top - r.height / 2);
  };

  const leave = () => {
    x.set(0);
    y.set(0);
    onLeave();
  };

  return (
    <motion.div
      style={
        reduce
          ? undefined
          : { rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }
      }
      onMouseMove={handleMove}
      onMouseEnter={(e) => onInspect(e, engine)}
      onMouseLeave={leave}
      whileHover={{ y: -4 }}
      className="group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-2xl border border-plum-700/5 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
    >
      {/* Decorative internal glow */}
      <div
        className={`absolute -right-12 -top-12 h-24 w-24 rounded-full bg-gradient-to-br ${engine.glow} opacity-10 blur-xl transition-[transform,opacity] duration-500 group-hover:scale-125 group-hover:opacity-30`}
      />

      <div style={{ transform: "translateZ(30px)" }}>
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-md border border-plum-700/10 bg-lavender-50 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-tight text-plum-700">
            {engine.algo}
          </span>
          <span
            className={`h-2 w-2 rounded-full bg-gradient-to-r ${engine.glow} animate-pulse`}
          />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-plum-900 transition-colors group-hover:text-lavender-600">
          {engine.name}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          {engine.desc}
        </p>
      </div>

      <div
        style={{ transform: "translateZ(15px)" }}
        className="mt-4 flex items-center justify-between border-t border-plum-700/5 pt-3 text-[11px] font-medium text-lavender-600/80"
      >
        <span>Encrypted · On-device</span>
        <span className="translate-x-0 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-1 group-hover:opacity-100">
          Inspect →
        </span>
      </div>
    </motion.div>
  );
}
