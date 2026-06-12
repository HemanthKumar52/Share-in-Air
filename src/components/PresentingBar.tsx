"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, CircleStop, Eye, MonitorUp, QrCode } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useUiStore } from "@/store/useUiStore";
import { useAir } from "./AirProvider";

/** Sticky bar shown while YOU are presenting: a live preview, how many are
    watching, an Invite (room code/QR) for off-network viewers, and Stop. */
export function PresentingBar() {
  const broadcast = useShareStore((s) => s.broadcast);
  const watchers = useShareStore((s) => s.watchers);
  const { stopBroadcast, createRoom } = useAir();
  const openRoom = useUiStore((s) => s.setRoomModalOpen);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && broadcast) {
      video.srcObject = broadcast.stream;
      video.muted = true;
      void video.play().catch(() => {});
    }
    return () => {
      if (video) video.srcObject = null;
    };
  }, [broadcast]);

  const invite = () => {
    createRoom();
    openRoom(true);
  };

  return (
    <AnimatePresence>
      {broadcast ? (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="sticky top-[4.25rem] z-30 mx-auto mt-3 w-[min(94vw,30rem)] px-1"
        >
          <div className="glass-strong sheen glow-ember flex items-center gap-3 rounded-2xl p-2">
            <span className="relative grid h-11 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} playsInline muted className="size-full object-cover" />
              <span className="absolute left-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-[var(--color-bad)]" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-haze">
                {broadcast.kind === "screen" ? (
                  <MonitorUp className="size-4 text-ember" />
                ) : (
                  <Camera className="size-4 text-ember" />
                )}
                Presenting your {broadcast.kind}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fog">
                <Eye className="size-3.5" />
                {watchers > 0
                  ? `${watchers} ${watchers === 1 ? "person" : "people"} watching`
                  : "Waiting for viewers — tap Invite to share"}
              </p>
            </div>

            <button
              onClick={invite}
              className="btn-ghost hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium sm:inline-flex"
            >
              <QrCode className="size-4" />
              Invite
            </button>
            <button
              onClick={invite}
              aria-label="Invite"
              className="btn-ghost grid size-9 place-items-center rounded-full sm:hidden"
            >
              <QrCode className="size-4" />
            </button>
            <button
              onClick={stopBroadcast}
              className="btn-ember inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold"
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
