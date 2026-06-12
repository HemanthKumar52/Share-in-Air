"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize, Minimize, Volume2, VolumeX, X } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useAir } from "./AirProvider";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export function ScreenStage() {
  const viewerKey = useShareStore((s) => s.viewerKey);
  const media = useShareStore((s) => (s.viewerKey ? s.remoteMedia[s.viewerKey] : undefined));
  const peerName = useShareStore((s) => {
    const m = s.viewerKey ? s.remoteMedia[s.viewerKey] : undefined;
    return m ? (s.peers.find((p) => p.id === m.peerId)?.name ?? "Device") : "";
  });
  const { closeViewer } = useAir();

  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const open = Boolean(viewerKey && media);

  // Escape closes the viewer — unless we're fullscreen, where Escape first exits it.
  useEscapeKey(open && !fullscreen, () => closeViewer());

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !media) return;
    video.srcObject = media.stream;
    video.muted = muted;
    const tryPlay = async () => {
      try {
        await video.play();
      } catch {
        // Autoplay with audio can be blocked — fall back to muted playback.
        video.muted = true;
        setMuted(true);
        try {
          await video.play();
        } catch {
          /* give up silently */
        }
      }
    };
    void tryPlay();
    // Release the stream reference on close/unmount (don't stop tracks — the
    // RTCPeerConnection owns them).
    return () => {
      video.pause();
      video.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  // Apply mute changes without tearing down the stream.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  return (
    <AnimatePresence>
      {open && media ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={shellRef}
            initial={{ scale: 0.96, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="glass-strong relative flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl"
          >
            {/* header */}
            <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-bad)] opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-bad)]" />
                </span>
                <p className="text-sm font-semibold text-haze">
                  {peerName}&apos;s {media.kind}
                </p>
                <span className="chip hidden sm:inline-flex">live</span>
              </div>
              <div className="flex items-center gap-1.5">
                {media.hasAudio ? (
                  <button
                    onClick={() => setMuted((m) => !m)}
                    aria-label={muted ? "Unmute" : "Mute"}
                    className="btn-ghost grid size-8 place-items-center rounded-full sm:size-9"
                  >
                    {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </button>
                ) : null}
                <button
                  onClick={toggleFullscreen}
                  aria-label="Fullscreen"
                  className="btn-ghost grid size-8 place-items-center rounded-full sm:size-9"
                >
                  {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                </button>
                <button
                  onClick={() => closeViewer()}
                  aria-label="Close viewer"
                  className="btn-ghost grid size-8 place-items-center rounded-full sm:size-9"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* video */}
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                className="absolute inset-0 size-full object-contain"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
