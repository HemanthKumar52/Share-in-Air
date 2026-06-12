"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, DoorOpen, LogIn, Plus, X } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useUiStore } from "@/store/useUiStore";
import { useAir } from "./AirProvider";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { toast } from "@/lib/toast";

export function RoomModal() {
  const open = useUiStore((s) => s.roomModalOpen);
  const setOpen = useUiStore((s) => s.setRoomModalOpen);
  const roomCode = useShareStore((s) => s.roomCode);
  const { createRoom, joinRoom, leaveRoom } = useAir();

  const [joinValue, setJoinValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEscapeKey(open, () => setOpen(false));
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const shareUrl = roomCode ? `${origin}/?room=${roomCode}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Room sharing"
            tabIndex={-1}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="glass-strong sheen relative z-10 w-full overflow-hidden rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:w-[min(94vw,26rem)] sm:rounded-3xl"
          >
            <div aria-hidden className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15 sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-haze">Room</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="btn-ghost grid size-9 place-items-center rounded-full"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-fog">
              Devices on the same WiFi find each other automatically. A room lets you connect
              across different networks.
            </p>

            {roomCode ? (
              <div className="mt-5 flex flex-col items-center">
                <div className="rounded-2xl bg-white p-3 shadow-lg">
                  {shareUrl ? (
                    <QRCodeSVG value={shareUrl} size={168} level="M" marginSize={0} />
                  ) : (
                    <div className="size-[168px] animate-pulse rounded-lg bg-black/10" />
                  )}
                </div>
                <p className="mt-4 text-xs uppercase tracking-wide text-fog">Room code</p>
                <p className="font-mono text-3xl font-bold tracking-[0.3em] text-ember-gradient sm:text-4xl">
                  {roomCode}
                </p>

                <div className="mt-5 flex w-full gap-2">
                  <button
                    onClick={copy}
                    className="btn-ghost flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium"
                  >
                    {copied ? <Check className="size-4 text-[var(--color-ok)]" /> : <Copy className="size-4" />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <button
                    onClick={() => {
                      leaveRoom();
                      setJoinValue("");
                    }}
                    className="btn-ghost flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--color-bad)]"
                  >
                    <DoorOpen className="size-4" />
                    Leave
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <button
                  onClick={createRoom}
                  className="btn-ember flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
                >
                  <Plus className="size-4" />
                  Create a room
                </button>

                <div className="flex items-center gap-3 text-xs text-ash">
                  <span className="h-px flex-1 bg-white/10" />
                  or join one
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (joinValue.trim()) {
                      joinRoom(joinValue.trim());
                      setOpen(false);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={joinValue}
                    onChange={(e) => setJoinValue(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={6}
                    aria-label="Room code"
                    aria-describedby="room-code-help"
                    className="glass-well flex-1 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-[0.25em] text-haze outline-none placeholder:tracking-normal placeholder:text-fog"
                  />
                  <p id="room-code-help" className="sr-only">
                    Enter the room code shared with you. Up to 6 letters and numbers; case is
                    ignored.
                  </p>
                  <button
                    type="submit"
                    disabled={!joinValue.trim()}
                    className="btn-ember grid place-items-center rounded-xl px-4 disabled:opacity-40"
                    aria-label="Join room"
                  >
                    <LogIn className="size-5" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
