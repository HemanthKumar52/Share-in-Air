"use client";

import { AnimatePresence, motion } from "motion/react";
import { QrCode, Radar } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useUiStore } from "@/store/useUiStore";
import { useAir } from "./AirProvider";
import { useElementSize } from "@/hooks/useElementSize";
import { DeviceBadge } from "./DeviceBadge";
import { PeerAvatar } from "./PeerAvatar";
import { clamp } from "@/lib/format";

const ORBIT_MAX = 7; // beyond this, fall back to a wrapped grid
const ORBIT_MIN_WIDTH = 640; // below this (phones) we use a grid, not an orbit

export function PeerRadar() {
  const peers = useShareStore((s) => s.peers);
  const ready = useShareStore((s) => s.ready);
  const status = useShareStore((s) => s.status);
  const mode = useShareStore((s) => s.mode);
  const { selectPeer } = useAir();
  const openRoom = useUiStore((s) => s.setRoomModalOpen);
  const { ref, width, height } = useElementSize<HTMLDivElement>();

  const hasPeers = peers.length > 0;
  // Orbit only on wider screens with a manageable peer count; otherwise a grid
  // below the badge — which never overlaps and scales to any size.
  const useOrbit = hasPeers && peers.length <= ORBIT_MAX && width >= ORBIT_MIN_WIDTH;
  const useGrid = hasPeers && !useOrbit;
  const radius =
    useOrbit && width && height ? clamp(Math.min(width, height) / 2 - 70, 140, 300) : 0;

  return (
    <div className="flex w-full flex-col items-center">
      {/* ── radar stage (the "you" badge, plus the orbit on wide screens) ────── */}
      <div
        ref={ref}
        className={`relative flex w-full items-center justify-center ${
          useOrbit ? "min-h-[46vh] py-8 lg:min-h-[52vh]" : "min-h-[240px] py-6 sm:min-h-[280px]"
        }`}
      >
        {/* faint concentric guides — only with an active orbit */}
        {radius > 0 ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            {[0.6, 0.85, 1.1].map((scale) => (
              <span
                key={scale}
                className="absolute rounded-full border border-white/[0.05]"
                style={{ width: radius * 2 * scale, height: radius * 2 * scale }}
              />
            ))}
          </div>
        ) : null}

        {/* centre — you */}
        <div className="relative z-10">
          <DeviceBadge />
        </div>

        {/* orbiting peers (wide screens) */}
        {radius > 0 ? (
          <div className="pointer-events-none absolute inset-0">
            <AnimatePresence>
              {peers.map((peer, i) => {
                const angle = -Math.PI / 2 + (i / peers.length) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                  <div
                    key={peer.id}
                    className="pointer-events-auto absolute left-1/2 top-1/2"
                    style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                  >
                    <PeerAvatar
                      peer={peer}
                      ready={Boolean(ready[peer.id])}
                      floatDelay={i * 0.4}
                      onClick={() => selectPeer(peer.id)}
                    />
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      {/* peer grid (phones, or many peers) — flows below the badge, never overlaps */}
      {useGrid ? (
        <div className="mb-2 flex flex-wrap items-start justify-center gap-3 px-2 sm:gap-5">
          <AnimatePresence>
            {peers.map((peer, i) => (
              <PeerAvatar
                key={peer.id}
                peer={peer}
                ready={Boolean(ready[peer.id])}
                floatDelay={i * 0.25}
                onClick={() => selectPeer(peer.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      {/* empty state — normal flow, below the badge so it never overlaps */}
      {!hasPeers ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-1 w-full max-w-md px-3 text-center sm:mt-3"
        >
          <div className="mx-auto mb-3 flex items-center justify-center gap-2 text-xs text-fog">
            <Radar className="size-4 animate-[var(--animate-spin-slow)] text-ember" />
            {status === "ready" ? "Listening for devices…" : "Connecting…"}
          </div>
          {mode === "local" ? (
            <>
              <span className="chip mb-3 inline-flex">Demo mode</span>
              <p className="text-sm leading-relaxed text-mist">
                No signaling backend is set, so devices can&apos;t find each other across the network
                yet. Open this page in a{" "}
                <span className="font-semibold text-haze">second browser tab</span> to try the full
                flow now — for real phone&nbsp;↔&nbsp;laptop sharing, add a Supabase key.
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-mist">
              Open <span className="font-semibold text-haze">Share in Air</span> on another device on
              the same WiFi and it&apos;ll appear here. Then tap it — or tap a capability above — to
              share.
            </p>
          )}
          <button
            onClick={() => openRoom(true)}
            className="btn-ghost mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
          >
            <QrCode className="size-4" />
            {mode === "local" ? "Show room code / QR" : "Different network? Use a room code"}
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
