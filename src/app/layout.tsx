import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BackgroundFX } from "@/components/BackgroundFX";
import { Toaster } from "@/components/Toaster";
import { MotionProvider } from "@/components/MotionProvider";

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
  // Only used in modals (room code, file sizes) — keep it off the critical path.
  preload: false,
});

const SITE_URL = "https://share-in-air.vercel.app";
const title = "Share in Air — Share your screen & files over WiFi, no app";
const description =
  "Share your screen, camera, photos, files and text to any device on the same WiFi — instantly, peer-to-peer, with no app, no account and no uploads. A free, open-source AirDrop and screen-mirror for the web.";

const keywords = [
  "share screen over wifi",
  "airdrop for web",
  "airdrop for pc",
  "screen sharing in browser",
  "share files over wifi",
  "snapdrop alternative",
  "screen mirror local network",
  "p2p file transfer",
  "webrtc screen share",
  "share photos same wifi",
  "send files between devices",
  "wireless screen share no app",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s · Share in Air" },
  description,
  applicationName: "Share in Air",
  keywords,
  authors: [{ name: "HemanthKumar52", url: "https://github.com/HemanthKumar52" }],
  creator: "HemanthKumar52",
  publisher: "Share in Air",
  category: "technology",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  verification: {
    google: "h9S_pS83U2rtyAKiqTO_XwiZhw0j2lXbumoubHQS55s",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Share in Air" },
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: "Share in Air",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@HemanthKumar52",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Structured data so search engines understand this is a free web app.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Share in Air",
  url: SITE_URL,
  description,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web, Windows, macOS, Linux, Android, iOS",
  browserRequirements: "Requires a modern browser with WebRTC",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isAccessibleForFree: true,
  inLanguage: "en-US",
  featureList: [
    "Live screen sharing over WiFi",
    "Camera / webcam sharing",
    "Peer-to-peer photo and file transfer",
    "Instant text and clipboard sharing",
    "Automatic same-network device discovery",
    "Room code and QR for cross-network sharing",
  ],
  author: { "@type": "Person", name: "HemanthKumar52", url: "https://github.com/HemanthKumar52" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <body className="grain min-h-dvh antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main-content"
          className="sr-only rounded-lg font-semibold focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:bg-ember focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        <MotionProvider>
          <BackgroundFX />
          <div className="relative z-10">{children}</div>
          <Toaster />
        </MotionProvider>
      </body>
    </html>
  );
}
