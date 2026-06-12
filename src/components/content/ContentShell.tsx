import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

function Mark() {
  return (
    <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
      <defs>
        <linearGradient id="cmark" x1="14" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB661" />
          <stop offset="50%" stopColor="#FF7A1A" />
          <stop offset="100%" stopColor="#FF4D3D" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="16" stroke="url(#cmark)" strokeWidth="4.5" fill="none" />
      <path
        d="M32 24 L32 41 M32 24 L26 30 M32 24 L38 30"
        stroke="#fff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const GUIDES: { href: string; label: string }[] = [
  { href: "/how-to-share-screen-over-wifi", label: "How to share your screen over WiFi" },
  { href: "/airdrop-for-web", label: "AirDrop for the web & PC" },
  { href: "/faq", label: "FAQ" },
];

export function ContentShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 sm:px-6">
      <header className="sticky top-0 z-30 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="glass sheen flex items-center justify-between gap-3 rounded-full px-3 py-2 pr-2.5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Share in Air home">
            <Mark />
            <span className="font-display text-[15px] font-semibold tracking-tight text-haze">
              Share <span className="text-ember-gradient">in Air</span>
            </span>
          </Link>
          <Link
            href="/"
            className="btn-ember inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          >
            Open the app
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1 pb-10 pt-6">
        {children}
      </main>

      <footer className="mb-8 border-t border-white/10 pt-6">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fog" aria-label="Guides">
          <Link href="/" className="transition-colors hover:text-haze">
            Home
          </Link>
          {GUIDES.map((g) => (
            <Link key={g.href} href={g.href} className="transition-colors hover:text-haze">
              {g.label}
            </Link>
          ))}
          <a
            href="https://github.com/HemanthKumar52/Share-in-Air"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-haze"
          >
            Open source
          </a>
        </nav>
        <p className="mt-4 text-xs text-ash">
          Share in Air — free, open-source, peer-to-peer screen &amp; file sharing over your WiFi.
        </p>
      </footer>
    </div>
  );
}
