"use client";

import { useEffect, useState } from "react";
import { Sparkle, CheckCircle } from "@phosphor-icons/react";

export default function ResetPage() {
  const [status, setStatus] = useState("Clearing all data and records...");

  useEffect(() => {
    async function performReset() {
      try {
        // 1. Wipe backend/cookie data
        await fetch("/api/reset-data", { method: "POST" });

        // 2. Clear browser localStorage and sessionStorage
        if (typeof window !== "undefined") {
          localStorage.clear();
          sessionStorage.clear();

          // 3. Clear all browser cookies client-side
          const cookies = document.cookie.split(";");
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        }

        setStatus("All records wiped successfully! Starting fresh onboarding...");
        
        // 4. Redirect to fresh onboarding
        setTimeout(() => {
          window.location.href = "/onboarding";
        }, 1200);
      } catch (err) {
        console.error("Reset error:", err);
        setStatus("Error resetting data. Redirecting to onboarding...");
        setTimeout(() => {
          window.location.href = "/onboarding";
        }, 1500);
      }
    }

    performReset();
  }, []);

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-6 text-pink-500 shadow-sm animate-pulse">
        <Sparkle weight="duotone" className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-semibold text-plum-900 mb-2">Resetting Sakhi</h1>
      <p className="text-sm text-plum-900/60 max-w-sm mb-6">{status}</p>
      <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
