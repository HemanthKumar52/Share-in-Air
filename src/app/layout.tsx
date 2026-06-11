import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BackgroundFX } from "@/components/BackgroundFX";
import { Toaster } from "@/components/Toaster";

// All three are variable fonts — next/font loads the full weight range, so we
// don't pin individual weights (Tailwind's font-weight utilities drive them).
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const title = "Share in Air — screens, photos & text across your WiFi";
const description =
  "Send a live screen, photos, files and text to any device on the same WiFi. Peer-to-peer, no uploads, no accounts. Open source.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Share in Air",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Share in Air",
  },
  openGraph: {
    title,
    description,
    type: "website",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <body className="grain min-h-dvh antialiased">
        <BackgroundFX />
        <div className="relative z-10">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
