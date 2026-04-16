import type { Metadata } from "next";
import { Caveat, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

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
    "Send and receive money using simple ₦handles like ₦victor. No more typing 10-digit account numbers.",
  applicationName: "NairaTag",
  openGraph: {
    title: "NairaTag",
    description:
      "Send money to a name — not an account number. Claim your ₦handle and get verified instantly.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NairaTag",
    description:
      "Send money to a name — not an account number. Claim your ₦handle and get verified instantly.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${hand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
