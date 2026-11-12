"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/kokonut";
import { useSession } from "next-auth/react";
import { sakhiSignOut } from "@/lib/clientSignOut";
import { List, X } from "@phosphor-icons/react";

/**
 * Navigation — single line at desktop, height capped under 80px.
 * Frosted glass pill that condenses on scroll.
 */
export function Navigation() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const { data: session, status } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Prefetch target routes in background for instant navigation
    router.prefetch("/her-mode");
    router.prefetch("/pregnancy-mode");
    router.prefetch("/onboarding");

    return () => window.removeEventListener("scroll", onScroll);
  }, [router]);

  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const resolveName = async () => {
      if (status !== "authenticated" || !session?.user?.email) {
        setUserName("");
        return;
      }

      // 1. Name saved in the user's Sakhi profile (server-side store)
      try {
        const me = await fetch("/api/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
        if (me?.name && String(me.name).trim()) {
          setUserName(String(me.name).trim());
          return;
        }
      } catch (e) {}

      // 2. Check localStorage
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sakhi_preferred_name");
        if (stored && stored.trim() && stored.trim() !== "Mama" && stored.trim() !== "friend") {
          setUserName(stored.trim());
          return;
        }
      }

      // 3. Fallback to Google account name
      if (session.user.name) {
        setUserName(session.user.name.split(" ")[0]);
      } else {
        setUserName("there");
      }
    };

    resolveName();

    const handleNameUpdate = (e: any) => {
      if (e?.detail?.name) {
        setUserName(e.detail.name);
      } else {
        resolveName();
      }
    };

    window.addEventListener("sakhi-name-updated", handleNameUpdate);
    window.addEventListener("sakhi_name_updated", handleNameUpdate);
    window.addEventListener("storage", resolveName);
    return () => {
      window.removeEventListener("sakhi-name-updated", handleNameUpdate);
      window.removeEventListener("sakhi_name_updated", handleNameUpdate);
      window.removeEventListener("storage", resolveName);
    };
  }, [session]);

  const goToMode = async () => {
    try {
      if (status !== "authenticated" || !session?.user?.email) {
        router.push("/login?callbackUrl=/onboarding");
        return;
      }

      const me = await fetch("/api/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const hasMom = Boolean(me?.hasMomProfile);
      const hasHer = Boolean(me?.hasHerProfile);
      const cookies = typeof document !== "undefined" ? document.cookie.split(";") : [];

      const activeMode =
        (typeof window !== "undefined" ? localStorage.getItem("sakhi_active_mode") : null) ||
        cookies.find((c) => c.trim().startsWith("sakhi_active_mode="))?.split("=")[1]?.trim();

      if (activeMode === "pregnancy" && hasMom) {
        router.push("/pregnancy-mode");
        return;
      }
      if (activeMode === "her" && hasHer) {
        router.push("/her-mode");
        return;
      }

      if (hasMom && !hasHer) {
        router.push("/pregnancy-mode");
        return;
      }
      if (hasHer && !hasMom) {
        router.push("/her-mode");
        return;
      }
      if (hasMom) {
        router.push("/pregnancy-mode");
        return;
      }
      if (hasHer) {
        router.push("/her-mode");
        return;
      }

      router.push("/onboarding");
    } catch (e) {
      router.push("/onboarding");
    }
  };

  const handleSignOut = async () => {
    try {
      await sakhiSignOut({ signedIn: true });
    } catch (e) {
      console.error(e);
      window.location.href = "/";
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { label: "Main", href: "#hero" },
    { label: "Cycle", href: "#cycle" },
    { label: "Mind", href: "#mind" },
    { label: "Care", href: "#care" },
    { label: "Privacy", href: "#privacy" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (href === "#hero" || href === "#main") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const elem = document.querySelector(href);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      initial={reduce ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-50 flex flex-col items-center px-3 sm:px-4 pt-3 sm:pt-4"
    >
      <nav
        className={`flex w-full max-w-5xl items-center justify-between gap-3 sm:gap-4 rounded-full pl-16 sm:pl-6 pr-3 sm:pr-5 py-2 transition-[background-color,border-color,box-shadow] duration-500 ease-[var(--ease-soft)]
          ${scrolled ? "glass-strong" : "bg-white/40 border border-white/50 backdrop-blur-md shadow-sm"}`}
        style={{ minHeight: "56px" }}
      >
        {/* Center links — hidden on small screens, shown on md+ */}
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => handleNavClick(e, l.href)}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-plum-900 cursor-pointer"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side: Auth status, CTA, and Mobile menu button */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {status === "authenticated" ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/95 border border-pink-300/50 shadow-[0_2px_8px_rgba(244,114,182,0.15)] shrink-0 flex items-center justify-center">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={userName || "User profile"}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-pink-200 to-purple-200 text-[#2D1B36] font-semibold text-xs">
                    {(userName || session?.user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="hidden text-xs font-medium text-plum-900 sm:inline">
                Hi, {userName || (session?.user?.name ? session.user.name.split(" ")[0] : "there")}
              </span>
              <Button
                variant="primary"
                onClick={goToMode}
                className="px-3.5 py-1.5 text-xs font-semibold"
                glow
              >
                Open Portal
              </Button>
              <button
                onClick={handleSignOut}
                className="hidden text-xs font-medium text-ink-soft hover:text-plum-900 transition-colors cursor-pointer sm:inline"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={() => router.push("/login")}
              className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold"
              glow
            >
              Sign In
            </Button>
          )}

          {/* Mobile hamburger menu toggle button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex md:hidden w-9 h-9 rounded-full bg-white/60 border border-white/60 items-center justify-center text-plum-900 hover:bg-white/90 transition-colors shadow-sm"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="md:hidden mt-2 w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-xl border border-pink-200/80 shadow-[0_12px_36px_rgba(244,114,182,0.22)] p-4 flex flex-col gap-2 z-50"
        >
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => handleNavClick(e, l.href)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-plum-900 hover:bg-pink-50 transition-colors flex items-center justify-between"
            >
              <span>{l.label}</span>
              <span className="text-pink-400 text-xs">→</span>
            </a>
          ))}

          {status === "authenticated" && (
            <div className="border-t border-pink-100/80 pt-2 mt-1 flex items-center justify-between px-2">
              <span className="text-xs text-ink-soft">
                Signed in as <strong>{userName}</strong>
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </motion.div>
      )}
    </motion.header>
  );
}
