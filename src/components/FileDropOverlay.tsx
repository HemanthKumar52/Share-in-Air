"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UploadCloud } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useAir } from "./AirProvider";
import { toast } from "@/lib/toast";

function hasFiles(e: DragEvent): boolean {
  return Boolean(e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files"));
}

export function FileDropOverlay() {
  const { sendFiles, selectPeer } = useAir();
  const [dragging, setDragging] = useState(false);
  const counter = useRef(0);

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      // When a peer sheet is open, it handles its own drops.
      if (useShareStore.getState().selectedPeerId) return;
      counter.current += 1;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e) && !useShareStore.getState().selectedPeerId) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      counter.current = Math.max(0, counter.current - 1);
      if (counter.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      counter.current = 0;
      setDragging(false);
      const state = useShareStore.getState();
      if (state.selectedPeerId) return; // handled by the sheet
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();

      const files = e.dataTransfer.files;
      const peers = state.peers;
      if (peers.length === 0) {
        toast.error("No devices nearby yet", { body: "Open the app on another device first." });
      } else if (peers.length === 1) {
        void sendFiles(peers[0].id, files);
        toast.info(`Sending to ${peers[0].name}…`);
      } else {
        toast.info("Pick a device, then drop", { body: "Tap the device you want to send to." });
        selectPeer(peers[0].id);
      }
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [sendFiles, selectPeer]);

  return (
    <AnimatePresence>
      {dragging ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
        >
          <div className="glass-strong sheen flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-[var(--color-ember)]/60 px-12 py-14 text-center">
            <motion.span
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className="bg-ember-gradient grid size-16 place-items-center rounded-2xl text-black shadow-xl"
            >
              <UploadCloud className="size-8" />
            </motion.span>
            <div>
              <p className="font-display text-xl font-semibold text-haze">Release to send</p>
              <p className="mt-1 text-sm text-fog">Your files will fly straight to the device</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
