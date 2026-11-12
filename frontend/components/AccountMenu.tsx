"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  SignOut, SignIn, GearSix, FileText, House, ArrowsLeftRight, DownloadSimple, WarningCircle,
} from "@phosphor-icons/react";
import { sakhiSignOut } from "@/lib/clientSignOut";

interface Props {
  mode: "her" | "pregnancy";
  displayName: string;
  onOpenSettings: () => void;
}

/** Avatar button with a menu: who is signed in, switch mode, settings, sign out. */
export default function AccountMenu({ mode, displayName, onOpenSettings }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [confirmGuest, setConfirmGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const signedIn = status === "authenticated";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const other = mode === "her" ? { label: "Switch to Mom Mode", href: "/pregnancy-mode", key: "pregnancy" } : { label: "Switch to Her Mode", href: "/her-mode", key: "her" };

  const doSignOut = async (eraseGuest = false) => {
    setBusy(true);
    await sakhiSignOut({ signedIn, eraseGuest });
  };

  const item = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#2D1B36]/80 hover:bg-[#2D1B36]/5 hover:text-[#2D1B36] transition-colors cursor-pointer text-left";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white/80 border-2 border-pink-300/60 shadow-[0_4px_16px_rgba(244,114,182,0.2)] flex items-center justify-center cursor-pointer hover:border-pink-400 transition-colors"
      >
        {session?.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-pink-200 to-purple-200 text-[#2D1B36] font-semibold">
            {displayName?.charAt(0)?.toUpperCase() || "S"}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl bg-white/95 backdrop-blur-xl border border-pink-100 shadow-[0_16px_40px_rgba(45,27,54,0.15)] p-2 z-[80]"
          >
            <div className="px-3 py-3 border-b border-[#2D1B36]/5 mb-1">
              <p className="text-sm font-semibold text-[#2D1B36] truncate">{session?.user?.name || displayName}</p>
              <p className="text-xs text-[#2D1B36]/55 truncate">
                {signedIn ? session?.user?.email : "Guest session on this device"}
              </p>
            </div>

            {!confirmGuest ? (
              <>
                <button role="menuitem" className={item} onClick={() => { setOpen(false); router.push(other.href); }}>
                  <ArrowsLeftRight className="w-4 h-4" /> {other.label}
                </button>
                <a role="menuitem" className={item} href={`/doctor-summary?mode=${mode}`}>
                  <FileText className="w-4 h-4" /> Doctor summary (PDF)
                </a>
                <button role="menuitem" className={item} onClick={() => { setOpen(false); onOpenSettings(); }}>
                  <GearSix className="w-4 h-4" /> Settings & privacy
                </button>
                <a role="menuitem" className={item} href="/api/export-data">
                  <DownloadSimple className="w-4 h-4" /> Download my data
                </a>
                <button role="menuitem" className={item} onClick={() => { try { sessionStorage.setItem("sakhi-intro-played", "true"); } catch {} router.push("/"); }}>
                  <House className="w-4 h-4" /> Home page
                </button>

                <div className="h-px bg-[#2D1B36]/5 my-1" />
                {signedIn ? (
                  <button role="menuitem" disabled={busy} className={`${item} text-rose-600 hover:text-rose-700 hover:bg-rose-50`} onClick={() => doSignOut()}>
                    <SignOut className="w-4 h-4" /> {busy ? "Signing out…" : "Sign out"}
                  </button>
                ) : (
                  <>
                    <button role="menuitem" className={item} onClick={() => { setOpen(false); router.push(`/login?callbackUrl=${encodeURIComponent(mode === "her" ? "/her-mode" : "/pregnancy-mode")}`); }}>
                      <SignIn className="w-4 h-4" /> Sign in to save across devices
                    </button>
                    <button role="menuitem" className={`${item} text-rose-600 hover:text-rose-700 hover:bg-rose-50`} onClick={() => setConfirmGuest(true)}>
                      <SignOut className="w-4 h-4" /> End guest session
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="p-3">
                <p className="text-sm font-semibold text-[#2D1B36] flex items-center gap-2"><WarningCircle className="w-4 h-4 text-rose-500" /> End guest session?</p>
                <p className="text-xs text-[#2D1B36]/65 mt-1.5 leading-relaxed">
                  Guest data lives only in this browser. Ending the session permanently erases it. Download it first, or sign in to keep it.
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setConfirmGuest(false)} className="flex-1 rounded-xl py-2 text-sm text-[#2D1B36]/70 bg-[#2D1B36]/5 hover:bg-[#2D1B36]/10 cursor-pointer">Cancel</button>
                  <button disabled={busy} onClick={() => doSignOut(true)} className="flex-1 rounded-xl py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 cursor-pointer disabled:opacity-60">
                    {busy ? "Ending…" : "Erase & exit"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
