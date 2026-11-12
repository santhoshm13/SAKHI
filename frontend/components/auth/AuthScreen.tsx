"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CircleNotch,
  Eye,
  EyeSlash,
  Lock,
  WarningCircle,
} from "@phosphor-icons/react";
import { PetalWind } from "@/components/PetalWind";

type AuthTab = "signin" | "signup";
type PreviewMode = "her" | "mom";

interface AuthScreenProps {
  initialTab?: AuthTab;
}

function resolveSafeCallback(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return null;
}

/** Delicate botanical wreath framing the Sakhi crest with gentle breeze sway. */
function FloralCrest({ reduce }: { reduce: boolean }) {
  const petals = [
    { angle: 0, fill: "#d9c2ee", delay: 0 },
    { angle: 45, fill: "#f6c6d2", delay: 0.4 },
    { angle: 90, fill: "#c3a3e4", delay: 0.8 },
    { angle: 135, fill: "#ee9fb1", delay: 1.2 },
    { angle: 180, fill: "#d9c2ee", delay: 1.6 },
    { angle: 225, fill: "#f6c6d2", delay: 2.0 },
    { angle: 270, fill: "#c3a3e4", delay: 2.4 },
    { angle: 315, fill: "#ee9fb1", delay: 2.8 },
  ];

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      {/* Ambient floral glow */}
      <div
        aria-hidden="true"
        className="breathe absolute inset-2 rounded-full bg-lavender-300/25 blur-2xl"
      />

      {/* Slowly rotating / swaying botanical halo */}
      <motion.svg
        viewBox="0 0 160 160"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={
          reduce ? undefined : { duration: 64, repeat: Infinity, ease: "linear" }
        }
      >
        {petals.map((p) => (
          <motion.g
            key={p.angle}
            transform={`rotate(${p.angle} 80 80)`}
            animate={
              reduce
                ? undefined
                : {
                    scale: [1, 1.06, 0.98, 1],
                    opacity: [0.5, 0.85, 0.55, 0.5],
                  }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration: 5.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: p.delay,
                  }
            }
            style={{ transformOrigin: "80px 80px" }}
          >
            <path
              d="M80 12 C88 22, 88 36, 80 42 C72 36, 72 22, 80 12 Z"
              fill={p.fill}
              fillOpacity="0.65"
            />
          </motion.g>
        ))}
        <circle
          cx="80"
          cy="80"
          r="50"
          fill="none"
          stroke="#d9c2ee"
          strokeOpacity="0.22"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      </motion.svg>

      {/* Center Sakhi crest */}
      <motion.div
        animate={reduce ? undefined : { y: [0, -3, 0] }}
        transition={
          reduce
            ? undefined
            : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-cream p-1.5"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/original-logo.png?v=4"
          alt="Sakhi crest"
          className="h-full w-full rounded-full object-contain"
        />
      </motion.div>
    </div>
  );
}

/** Interactive cycle / maternal preview on the fixed left stage. */
function StageModePreview({
  mode,
  onChange,
  reduce,
}: {
  mode: PreviewMode;
  onChange: (m: PreviewMode) => void;
  reduce: boolean;
}) {
  const isHer = mode === "her";

  return (
    <div className="w-full max-w-md">
      <div
        role="tablist"
        aria-label="Preview Sakhi care modes"
        className="inline-flex rounded-full bg-plum-800 p-1"
      >
        {(
          [
            { id: "her", label: "Her Mode" },
            { id: "mom", label: "Mom Mode" },
          ] as const
        ).map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300 ${
                active
                  ? "bg-cream text-plum-900"
                  : "text-cream/75 hover:text-cream"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={mode}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 rounded-[26px] bg-plum-800 p-6 sm:p-7 text-cream"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-lavender-200">
              {isHer ? "Cycle & hormone rhythm" : "Maternal & fetal vitals"}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-cream">
              {isHer ? "Day 18 of 29" : "Week 24 · Day 3"}
            </p>
          </div>

          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle
              cx="32"
              cy="32"
              r="25"
              fill="none"
              stroke="rgba(251, 246, 243, 0.16)"
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r="25"
              fill="none"
              stroke={isHer ? "#c3a3e4" : "#ee9fb1"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${isHer ? 98 : 94} 160`}
              transform="rotate(-90 32 32)"
            />
            <text
              x="32"
              y="36"
              textAnchor="middle"
              fill="#fbf6f3"
              fontSize="13"
              fontWeight="600"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {isHer ? "62%" : "60%"}
            </text>
          </svg>
        </div>

        <p className="mt-4 text-base leading-relaxed text-cream/85">
          {isHer
            ? "Early luteal window. Sleep and mood logs calibrate your personal PMS, PCOS, and thyroid screening baselines."
            : "Second trimester check-ins track fasting glucose, blood pressure trends, kick counts, and OB-GYN visit notes."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-plum-900/70 p-3.5">
            <p className="text-sm text-cream/75">
              {isHer ? "Screening focus" : "Latest vitals"}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-cream">
              {isHer ? "PCOS & Thyroid" : "118/76 mmHg"}
            </p>
          </div>
          <div className="rounded-2xl bg-plum-900/70 p-3.5">
            <p className="text-sm text-cream/75">
              {isHer ? "Clinical export" : "Fasting glucose"}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-cream">
              {isHer ? "90-day PDF brief" : "86 mg/dL · Optimal"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthScreen({ initialTab = "signin" }: AuthScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduce = Boolean(useReducedMotion());
  const { data: session, status } = useSession();

  const urlTab = searchParams.get("tab") === "signup" ? "signup" : searchParams.get("tab") === "signin" ? "signin" : null;
  const callbackUrl = resolveSafeCallback(searchParams.get("callbackUrl"));

  const [tab, setTab] = useState<AuthTab>(urlTab || initialTab);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("her");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Interaction states
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<"her" | "pregnancy" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlTab) setTab(urlTab);
  }, [urlTab]);

  // Surface NextAuth URL error query parameters cleanly
  useEffect(() => {
    const authErr = searchParams.get("error");
    if (!authErr) return;
    if (authErr === "OAuthAccountNotLinked") {
      setError("This email is registered with a different sign-in method. Please use your original sign-in option.");
    } else if (authErr === "CredentialsSignin") {
      setError("Invalid email or password.");
    } else if (authErr === "OAuthCallback" || authErr === "OAuthSignin") {
      setError("Google sign-in could not be completed. You can also sign in with email and password below.");
    }
  }, [searchParams]);

  // Redirect signed-in users straight to their destination
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;
    let active = true;

    const redirectSignedIn = async () => {
      if (callbackUrl && callbackUrl !== "/login" && callbackUrl !== "/signup") {
        router.replace(callbackUrl);
        return;
      }
      try {
        const me = await fetch("/api/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
        if (!active) return;
        const storedMode = typeof window !== "undefined" ? localStorage.getItem("sakhi_active_mode") : null;
        if (storedMode === "pregnancy" && me?.hasMomProfile) {
          router.replace("/pregnancy-mode");
          return;
        }
        if (storedMode === "her" && me?.hasHerProfile) {
          router.replace("/her-mode");
          return;
        }
        if (me?.hasMomProfile) {
          router.replace("/pregnancy-mode");
          return;
        }
        if (me?.hasHerProfile) {
          router.replace("/her-mode");
          return;
        }
      } catch {
        // fall through to onboarding
      }
      if (active) router.replace("/onboarding");
    };

    redirectSignedIn();
    return () => {
      active = false;
    };
  }, [status, session, callbackUrl, router]);

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setError(null);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (tab === "signup") {
      if (trimmedName.length < 2) {
        setError("Please enter your name (at least 2 characters).");
        return;
      }
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter to confirm.");
        return;
      }
    } else {
      if (!trimmedEmail || !password) {
        setError("Please enter both your email address and password.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (tab === "signup") {
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            password,
          }),
        });
        const regData = await regRes.json().catch(() => ({}));
        if (!regRes.ok) {
          setError(regData.error || "Could not create your account.");
          setSubmitting(false);
          return;
        }
        try {
          localStorage.setItem("sakhi_preferred_name", trimmedName.split(" ")[0]);
        } catch {
          // ignore storage errors
        }
      }

      const signInRes = await signIn("credentials", {
        email: trimmedEmail,
        password,
        redirect: false,
      });

      if (!signInRes || signInRes.error) {
        setError(signInRes?.error || "Invalid email or password.");
        setSubmitting(false);
        return;
      }

      const dest = callbackUrl && callbackUrl !== "/login" && callbackUrl !== "/signup" ? callbackUrl : "/onboarding";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error while signing in. Please try again.");
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError(null);
    setGoogleBusy(true);
    const dest = callbackUrl && callbackUrl !== "/login" && callbackUrl !== "/signup" ? callbackUrl : "/onboarding";
    signIn("google", { callbackUrl: dest });
  };

  const loadGuestDemo = async (mode: "her" | "pregnancy") => {
    setDemoBusy(mode);
    setError(null);
    try {
      const res = await fetch("/api/demo-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load demo");
      localStorage.setItem("sakhi_active_mode", mode);
      localStorage.setItem("sakhi_preferred_name", mode === "pregnancy" ? "Meera" : "Priya");
      window.location.href = data.redirect;
    } catch (err: any) {
      setError(err?.message || "Could not start demo session.");
      setDemoBusy(null);
    }
  };

  const busy = submitting || googleBusy || demoBusy !== null;

  return (
    <div className="relative min-h-[100dvh] bg-cream text-ink lg:grid lg:grid-cols-[46fr_54fr]">
      {/* Compact header on mobile; full sticky sanctuary stage on desktop */}
      <aside className="relative overflow-hidden bg-plum-900 text-cream px-6 py-5 lg:sticky lg:top-0 lg:h-[100dvh] lg:px-12 lg:py-9 flex flex-col justify-between">
        <PetalWind contained className="pointer-events-none absolute inset-0 z-[1] h-full w-full" />
        {/* Soft breathing blooms inside the sanctuary stage */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="breathe absolute -top-20 -right-16 h-72 w-72 rounded-full bg-lavender-400/20 blur-3xl" />
          <div
            className="breathe absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-blush-400/15 blur-3xl"
            style={{ animationDelay: "3s" }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/original-logo.png?v=4"
                alt="Sakhi"
                className="h-full w-full object-contain"
              />
            </span>
            <span className="text-lg font-semibold tracking-tight text-cream">Sakhi</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cream/85 hover:text-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300 rounded-md px-2 py-1"
          >
            <ArrowLeft size={15} weight="bold" aria-hidden="true" />
            <span>Home</span>
          </Link>
        </div>

        {/* Desktop stage body: floral crest + editorial voice + interactive preview */}
        <div className="relative z-10 hidden lg:flex flex-col gap-6 my-auto py-4">
          <div className="flex items-center gap-5">
            <FloralCrest reduce={reduce} />
            <div className="max-w-xs">
              <p className="text-2xl font-medium leading-snug tracking-tight text-cream">
                Your body speaks.{" "}
                <span className="display-serif text-[1.85rem] text-lavender-200">
                  Sakhi listens.
                </span>
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-cream/75">
                Every cycle phase and trimester held in one quiet, private timeline.
              </p>
            </div>
          </div>

          <StageModePreview mode={previewMode} onChange={setPreviewMode} reduce={reduce} />
        </div>

        <div className="relative z-10 hidden lg:flex items-center gap-2.5 text-sm text-cream/75">
          <Lock size={16} weight="duotone" aria-hidden="true" className="text-lavender-300 shrink-0" />
          <span>Private workspace per account. Download or delete your records anytime.</span>
        </div>
      </aside>

      {/* Right column: single-measure auth workbench floating cleanly above petal breeze */}
      <main className="relative overflow-hidden flex flex-col justify-center px-6 py-8 sm:px-12 lg:px-16">
        <PetalWind contained className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-95" />
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto w-full max-w-[460px]"
        >
          {/* Mode tabs: Sign In / Create Account */}
          <div
            role="tablist"
            aria-label="Account access mode"
            className="grid grid-cols-2 rounded-full bg-cream-deep p-1 mb-6"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signin"}
              onClick={() => switchTab("signin")}
              className={`rounded-full py-2 text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${
                tab === "signin"
                  ? "bg-cream text-plum-900"
                  : "text-plum-800/80 hover:text-plum-900"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signup"}
              onClick={() => switchTab("signup")}
              className={`rounded-full py-2 text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${
                tab === "signup"
                  ? "bg-cream text-plum-900"
                  : "text-plum-800/80 hover:text-plum-900"
              }`}
            >
              Create account
            </button>
          </div>

          <header className="mb-5">
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-plum-900">
              {tab === "signin" ? "Sign in to your Sakhi space" : "Create your Sakhi account"}
            </h1>
            <p className="mt-1.5 text-base leading-relaxed text-plum-800">
              {tab === "signin"
                ? "Enter your email and password, or continue with Google."
                : "Set up a private space for cycle, maternal, and mood logs."}
            </p>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl bg-blush-50 border border-blush-300 px-4 py-3 text-sm text-plum-900"
            >
              <WarningCircle size={18} weight="fill" aria-hidden="true" className="text-blush-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} noValidate className="space-y-3.5">
            {tab === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-name" className="text-sm font-medium text-plum-800">
                  Full name
                </label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Priya Sharma"
                  disabled={busy}
                  className="w-full rounded-xl border border-plum-900/15 bg-cream-deep/65 px-4 py-3 text-base text-plum-900 placeholder:text-ink-soft/60 focus:bg-white focus:border-lavender-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500/40 transition-colors duration-150 disabled:opacity-60"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-email" className="text-sm font-medium text-plum-800">
                Email address
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={busy}
                className="w-full rounded-xl border border-plum-900/15 bg-cream-deep/65 px-4 py-3 text-base text-plum-900 placeholder:text-ink-soft/60 focus:bg-white focus:border-lavender-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500/40 transition-colors duration-150 disabled:opacity-60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-password" className="text-sm font-medium text-plum-800">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={tab === "signup" ? 8 : undefined}
                  aria-describedby={tab === "signup" ? "auth-password-hint" : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "signup" ? "Minimum 8 characters" : "Enter your password"}
                  disabled={busy}
                  className="w-full rounded-xl border border-plum-900/15 bg-cream-deep/65 pl-4 pr-12 py-3 text-base text-plum-900 placeholder:text-ink-soft/60 focus:bg-white focus:border-lavender-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500/40 transition-colors duration-150 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-soft hover:text-plum-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
                >
                  {showPassword ? (
                    <EyeSlash size={18} weight="regular" aria-hidden="true" />
                  ) : (
                    <Eye size={18} weight="regular" aria-hidden="true" />
                  )}
                </button>
              </div>
              {tab === "signup" && (
                <p id="auth-password-hint" className="text-sm text-ink-soft">
                  Use at least 8 characters. Mix letters and numbers for stronger protection.
                </p>
              )}
            </div>

            {tab === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-confirm" className="text-sm font-medium text-plum-800">
                  Confirm password
                </label>
                <input
                  id="auth-confirm"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  disabled={busy}
                  className="w-full rounded-xl border border-plum-900/15 bg-cream-deep/65 px-4 py-3 text-base text-plum-900 placeholder:text-ink-soft/60 focus:bg-white focus:border-lavender-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500/40 transition-colors duration-150 disabled:opacity-60"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              aria-busy={submitting}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-plum-900 px-6 py-3.5 text-sm font-medium text-cream hover:bg-plum-800 active:scale-[0.99] transition-[background-color,transform] duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              {submitting ? (
                <>
                  <CircleNotch size={18} className="animate-spin" aria-hidden="true" />
                  <span>{tab === "signin" ? "Signing in…" : "Creating account…"}</span>
                </>
              ) : (
                <>
                  <span>{tab === "signin" ? "Sign in with email" : "Create account"}</span>
                  <ArrowRight size={16} weight="bold" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Alternative sign-in */}
          <p className="my-4 text-center text-sm text-plum-800/80">or</p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            aria-busy={googleBusy}
            className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-plum-900/15 bg-white px-5 py-3 text-sm font-medium text-plum-900 hover:bg-cream-deep/60 active:scale-[0.99] transition-[background-color,transform] duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            {googleBusy ? (
              <CircleNotch size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{googleBusy ? "Connecting to Google…" : "Continue with Google"}</span>
          </button>

          {/* Guest sample exploration */}
          <div className="mt-6 rounded-2xl bg-cream-deep/55 p-4 sm:p-5">
            <p className="text-sm font-medium text-plum-900">Explore with sample data</p>
            <p className="mt-0.5 text-sm text-plum-800/85">
              Try a pre-filled workspace on this device with no sign-up required.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => loadGuestDemo("her")}
                className="rounded-xl bg-cream hover:bg-white px-4 py-2.5 text-left transition-colors duration-150 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
              >
                <span className="block text-sm font-semibold text-plum-900">
                  {demoBusy === "her" ? "Loading…" : "Her Mode demo"}
                </span>
                <span className="block text-sm text-plum-800/80">3 months of cycles</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => loadGuestDemo("pregnancy")}
                className="rounded-xl bg-cream hover:bg-white px-4 py-2.5 text-left transition-colors duration-150 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
              >
                <span className="block text-sm font-semibold text-plum-900">
                  {demoBusy === "pregnancy" ? "Loading…" : "Mom Mode demo"}
                </span>
                <span className="block text-sm text-plum-800/80">32 weeks pregnant</span>
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
