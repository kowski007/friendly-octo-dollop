import type { Metadata } from "next";
import { Caveat, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { PrivyAppProvider } from "@/components/auth/PrivyAppProvider";
import { ToastProvider } from "@/components/nairatag/ToastProvider";

import "./globals.css";

const themeInitScript = `
(() => {
  try {
    const key = 'nairatag-theme';
    const saved = window.localStorage.getItem(key);
    const theme = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const hand = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "NairaTag",
    template: "%s | NairaTag",
  },
  description:
    "Send and receive money using simple \u20A6handles like \u20A6victor. No more typing 10-digit account numbers.",
  applicationName: "NairaTag",
  openGraph: {
    title: "NairaTag",
    description:
      "Send money to a name \u2014 not an account number. Claim your \u20A6handle and get verified instantly.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NairaTag",
    description:
      "Send money to a name \u2014 not an account number. Claim your \u20A6handle and get verified instantly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${hand.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-white font-sans text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
        <PrivyAppProvider>
          <ToastProvider>{children}</ToastProvider>
        </PrivyAppProvider>
      </body>
    </html>
  );
}
