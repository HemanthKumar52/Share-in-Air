import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg leading-relaxed text-mist">{children}</p>;
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="font-display mt-12 scroll-mt-24 text-2xl font-semibold tracking-tight text-haze sm:text-3xl"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-7 text-lg font-semibold text-haze">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 leading-relaxed text-mist">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mt-4 space-y-2">{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 leading-relaxed text-mist">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />
      <span>{children}</span>
    </li>
  );
}

export function CTA() {
  return (
    <div className="glass-strong sheen mt-14 flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
      <h2 className="font-display text-2xl font-semibold text-haze">Try it now — it&apos;s free</h2>
      <p className="max-w-md text-sm text-mist">
        Open Share in Air on two devices on the same WiFi and start sharing your screen, photos,
        files and text in seconds. No app, no account.
      </p>
      <Link
        href="/"
        className="btn-ember mt-1 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
      >
        Open Share in Air
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
