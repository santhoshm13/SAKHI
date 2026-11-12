import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#fbf6f3",
};

export const metadata: Metadata = {
  title: "Sakhi — your body speaks. Sakhi listens.",
  description:
    "The AI-powered companion connecting menstrual cycle, maternal care, and mental wellness into one seamless system.",
  icons: {
    icon: [
      { url: "/original-logo.png?v=5", type: "image/png" },
      { url: "/favicon.ico?v=5" },
    ],
    shortcut: "/original-logo.png?v=5",
    apple: "/original-logo.png?v=5",
  },
  keywords: [
    "women's health",
    "menstrual cycle",
    "maternal care",
    "mental wellness",
    "AI health companion",
    "Bharat",
  ],
  openGraph: {
    title: "Sakhi — your body speaks. Sakhi listens.",
    description:
      "The AI-powered companion connecting menstrual cycle, maternal care, and mental wellness.",
    type: "website",
  },
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/original-logo.png?v=5" type="image/png" />
        <link rel="shortcut icon" href="/original-logo.png?v=5" type="image/png" />
        <link rel="apple-touch-icon" href="/original-logo.png?v=5" />
        {/* Geist + Instrument Serif via Google Fonts (self-host in production) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=Pacifico&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
