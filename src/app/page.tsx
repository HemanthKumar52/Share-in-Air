"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MonitorUp, Camera, Github, ShieldCheck } from "lucide-react";
import { AirProvider, useAir } from "@/components/AirProvider";
import { TopBar } from "@/components/TopBar";
import { PeerRadar } from "@/components/PeerRadar";
import { SeoContent } from "@/components/SeoContent";
import { useShareStore } from "@/store/useShareStore";

// Interactive overlays aren't needed for first paint or SEO — load them lazily
// on the client to keep the initial JS bundle small.
const PresentingBar = dynamic(() => import("@/components/PresentingBar").then((m) => m.PresentingBar), { ssr: false });
const SharePeerSheet = dynamic(() => import("@/components/SharePeerSheet").then((m) => m.SharePeerSheet), { ssr: false });
const ScreenStage = dynamic(() => import("@/components/ScreenStage").then((m) => m.ScreenStage), { ssr: false });
const TransfersDock = dynamic(() => import("@/components/TransfersDock").then((m) => m.TransfersDock), { ssr: false });
const RoomModal = dynamic(() => import("@/components/RoomModal").then((m) => m.RoomModal), { ssr: false });
const FileDropOverlay = dynamic(() => import("@/components/FileDropOverlay").then((m) => m.FileDropOverlay), { ssr: false });
const ImageLightbox = dynamic(() => import("@/components/ImageLightbox").then((m) => m.ImageLightbox), { ssr: false });

function Hero() {
  const peerCount = useShareStore((s) => s.peers.length);
  const broadcasting = useShareStore((s) => Boolean(s.broadcast));
  const { quickShare } = useAir();
  return (
    <div className="mt-5 text-center sm:mt-8">
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-haze sm:text-4xl">
        Share your screen, <span className="text-ember-gradient">through the air</span>
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-mist sm:text-base">
        Present to anyone on your WiFi — they just tap to watch. Or send photos, files and text
        to a device. Peer-to-peer, nothing uploaded.
      </p>

      {/* primary broadcast actions — no pairing needed */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => quickShare("screen")}
          className="btn-ember inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
          disabled={broadcasting}
        >
          <MonitorUp className="size-5" />
          Share my screen
        </button>
        <button
          type="button"
          onClick={() => quickShare("camera")}
          className="btn-ghost inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold"
        >
          <Camera className="size-5" />
          Camera
        </button>
      </div>
      <p className="mt-2.5 text-xs text-fog">
        {peerCount > 0
          ? "…or tap a device below to send files & text, or watch their screen"
          : "…or share files & text once a device appears below"}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-8 mb-6 w-full max-w-3xl px-4 text-center">
      <nav
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-fog"
        aria-label="Guides"
      >
        <Link href="/how-to-share-screen-over-wifi" className="transition-colors hover:text-haze">
          How to share your screen over WiFi
        </Link>
        <Link href="/airdrop-for-web" className="transition-colors hover:text-haze">
          AirDrop for the web &amp; PC
        </Link>
        <Link href="/faq" className="transition-colors hover:text-haze">
          FAQ
        </Link>
        <a
          href="https://github.com/HemanthKumar52/Share-in-Air"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-haze"
        >
          <Github className="size-3.5" />
          Open source
        </a>
      </nav>
      <p className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-ash">
        <ShieldCheck className="size-3.5 text-[var(--color-ok)]" />
        End-to-end peer-to-peer — your media never touches a server.
      </p>
    </footer>
  );
}

export default function Page() {
  return (
    <AirProvider>
      <main id="main-content" className="relative flex min-h-dvh flex-col">
        <TopBar />
        <PresentingBar />

        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
          <Hero />
          <PeerRadar />
          <SeoContent />
          <Footer />
        </section>

        {/* overlays */}
        <SharePeerSheet />
        <ScreenStage />
        <ImageLightbox />
        <TransfersDock />
        <RoomModal />
        <FileDropOverlay />
      </main>
    </AirProvider>
  );
}
