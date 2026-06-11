"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleStop, MonitorUp, Camera } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useAir } from "./AirProvider";

export function OutgoingShareBar() {
  const outgoing = useShareStore((s) => s.outgoing);
  const targetName = useShareStore((s) =>
    outgoing ? (s.peers.find((p) => p.id === outgoing.peerId)?.name ?? "a device") : "",
  );
  const { stopOutgoing } = useAir();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && outgoing) {
      video.srcObject = outgoing.stream;
      video.muted = true;
      void video.play().catch(() => {});
    }
    return () => {
      if (video) video.srcObject = null;
    };
  }, [outgoing]);

  return (
    <AnimatePresence>
      {outgoing ? (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="fixed left-1/2 top-[4.75rem] z-30 -translate-x-1/2"
        >
          <div className="glass-strong sheen glow-ember flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-2">
            <span className="relative grid h-10 w-16 place-items-center overflow-hidden rounded-full bg-black">
              <video ref={videoRef} playsInline muted className="size-full object-cover" />
              <span className="absolute left-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-[var(--color-bad)]" />
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              {outgoing.kind === "screen" ? (
                <MonitorUp className="size-4 text-ember" />
              ) : (
                <Camera className="size-4 text-ember" />
              )}
              <span className="font-medium text-haze">Sharing {outgoing.kind}</span>
              <span className="hidden text-fog sm:inline">to {targetName}</span>
            </span>
            <button
              onClick={stopOutgoing}
              className="btn-ember ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
            >
              <CircleStop className="size-4" />
              Stop
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
