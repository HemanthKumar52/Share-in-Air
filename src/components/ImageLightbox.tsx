"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { isImage } from "@/lib/files";
import { useAir } from "./AirProvider";

/** Full-screen viewer for received photos. Opens automatically when an image
    arrives, and is also reachable by tapping any image thumbnail. */
export function ImageLightbox() {
  const previewId = useShareStore((s) => s.previewId);
  const transfers = useShareStore((s) => s.transfers);
  const peers = useShareStore((s) => s.peers);
  const setPreview = useShareStore((s) => s.setPreview);
  const { saveTransfer } = useAir();

  const gallery = useMemo(
    () =>
      Object.values(transfers)
        .filter((t) => t.direction === "recv" && t.status === "done" && t.url && isImage(t.mime))
        .sort((a, b) => a.startedAt - b.startedAt),
    [transfers],
  );

  const current = previewId ? transfers[previewId] : undefined;
  const open = Boolean(current && current.url);
  useEscapeKey(open, () => setPreview(null));

  const index = current ? gallery.findIndex((t) => t.id === current.id) : -1;
  const fromName = current
    ? (peers.find((p) => p.id === current.peerId)?.name ?? "a device")
    : "";

  const go = (delta: number) => {
    if (index < 0) return;
    const next = gallery[index + delta];
    if (next) setPreview(next.id);
  };

  return (
    <AnimatePresence>
      {open && current ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-2 backdrop-blur-md sm:p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Close preview" onClick={() => setPreview(null)} className="absolute inset-0" />

          {/* top bar */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-haze">{current.name}</p>
              <p className="text-xs text-fog">
                from {fromName}
                {gallery.length > 1 ? ` · ${index + 1}/${gallery.length}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => saveTransfer(current)}
                className="btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium"
              >
                <Download className="size-4" />
                Save
              </button>
              <button
                onClick={() => setPreview(null)}
                aria-label="Close"
                className="btn-ghost grid size-9 place-items-center rounded-full"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            key={current.id}
            src={current.url}
            alt={current.name}
            initial={{ scale: 0.96, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-h-[80dvh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
          />

          {/* gallery nav */}
          {gallery.length > 1 ? (
            <>
              <button
                onClick={() => go(-1)}
                disabled={index <= 0}
                aria-label="Previous photo"
                className="btn-ghost absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full disabled:opacity-30 sm:left-3 sm:size-10 md:size-11"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={() => go(1)}
                disabled={index >= gallery.length - 1}
                aria-label="Next photo"
                className="btn-ghost absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full disabled:opacity-30 sm:right-3 sm:size-10 md:size-11"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
