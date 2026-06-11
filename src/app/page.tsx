"use client";

import { MonitorUp, Camera, ImageUp, Type, Github, ShieldCheck } from "lucide-react";
import { AirProvider, useAir, type QuickShareKind } from "@/components/AirProvider";
import { TopBar } from "@/components/TopBar";
import { PeerRadar } from "@/components/PeerRadar";
import { OutgoingShareBar } from "@/components/OutgoingShareBar";
import { SharePeerSheet } from "@/components/SharePeerSheet";
import { ScreenStage } from "@/components/ScreenStage";
import { TransfersDock } from "@/components/TransfersDock";
import { RoomModal } from "@/components/RoomModal";
import { FileDropOverlay } from "@/components/FileDropOverlay";
import { useShareStore } from "@/store/useShareStore";

const CAPABILITIES: { icon: typeof MonitorUp; label: string; kind: QuickShareKind }[] = [
  { icon: MonitorUp, label: "Screen", kind: "screen" },
  { icon: Camera, label: "Camera", kind: "camera" },
  { icon: ImageUp, label: "Photos & files", kind: "files" },
  { icon: Type, label: "Text", kind: "text" },
];

function Hero() {
  const peerCount = useShareStore((s) => s.peers.length);
  const { quickShare } = useAir();
  return (
    <div className="mt-5 text-center sm:mt-8">
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-haze sm:text-4xl">
        {peerCount > 0 ? (
          <>
            Tap a device to <span className="text-ember-gradient">send</span>
          </>
        ) : (
          <>
            Everything, <span className="text-ember-gradient">through the air</span>
          </>
        )}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-mist sm:text-base">
        Live screens, camera, photos, files and text — straight to any device on your WiFi.
        Peer-to-peer, nothing uploaded.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {CAPABILITIES.map(({ icon: Icon, label, kind }) => (
          <button
            key={label}
            type="button"
            onClick={() => quickShare(kind)}
            className="chip cursor-pointer transition hover:bg-white/10 hover:text-haze active:scale-95"
          >
            <Icon className="size-3.5 text-ember" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-6 mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-center text-[11px] text-fog">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-[var(--color-ok)]" />
        End-to-end peer-to-peer — media never touches a server
      </span>
      <a
        href="https://github.com/HemanthKumar52/Share-in-Air"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 text-fog transition-colors hover:text-haze"
      >
        <Github className="size-3.5" />
        Open source
      </a>
    </footer>
  );
}

export default function Page() {
  return (
    <AirProvider>
      <main className="relative flex min-h-dvh flex-col">
        <TopBar />
        <OutgoingShareBar />

        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
          <Hero />
          <PeerRadar />
          <Footer />
        </section>

        {/* overlays */}
        <SharePeerSheet />
        <ScreenStage />
        <TransfersDock />
        <RoomModal />
        <FileDropOverlay />
      </main>
    </AirProvider>
  );
}
