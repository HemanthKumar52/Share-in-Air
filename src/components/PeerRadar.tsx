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

export function PeerRadar() {
  const peers = useShareStore((s) => s.peers);
  const ready = useShareStore((s) => s.ready);
  const status = useShareStore((s) => s.status);
  const { selectPeer } = useAir();
  const openRoom = useUiStore((s) => s.setRoomModalOpen);
  const { ref, width, height } = useElementSize<HTMLDivElement>();

  const useOrbit = peers.length > 0 && peers.length <= ORBIT_MAX;
  const radius =
    width && height ? clamp(Math.min(width, height) / 2 - 70, 116, 280) : 0;

  return (
    <div ref={ref} className="relative flex min-h-[58vh] w-full items-center justify-center md:min-h-[64vh]">
      {/* faint concentric radar guides */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.6]">
        {[0.55, 0.8, 1.05].map((scale) => (
          <span
            key={scale}
            className="absolute rounded-full border border-white/[0.05]"
            style={{ width: radius * 2 * scale, height: radius * 2 * scale }}
          />
        ))}
      </div>

      {/* centre — you */}
      <div className="relative z-10">
        <DeviceBadge />
      </div>

      {/* orbiting peers (desktop & small counts) */}
      {useOrbit && radius > 0 ? (
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

      {/* grid fallback for many peers */}
      {peers.length > ORBIT_MAX ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-4 px-4">
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

      {/* empty state */}
      {peers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-2 left-1/2 w-[min(90vw,30rem)] -translate-x-1/2 text-center"
        >
          <div className="mx-auto mb-4 flex items-center justify-center gap-2 text-xs text-fog">
            <Radar className="size-4 animate-[var(--animate-spin-slow)] text-ember" />
            {status === "ready" ? "Listening for devices on your network…" : "Connecting…"}
          </div>
          <p className="text-sm text-mist">
            Open <span className="font-semibold text-haze">Share in Air</span> on another device on
            the same WiFi and it&apos;ll appear here.
          </p>
          <button
            onClick={() => openRoom(true)}
            className="btn-ghost mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
          >
            <QrCode className="size-4" />
            Different network? Use a room code
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
