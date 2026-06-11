"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Camera,
  Eye,
  FileUp,
  ImageUp,
  MonitorUp,
  Radio,
  Send,
  X,
} from "lucide-react";
import { useShareStore, mediaKey } from "@/store/useShareStore";
import { useAir } from "./AirProvider";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { DeviceIcon, deviceLabel } from "./DeviceIcon";
import { TransferRow } from "./TransferRow";

function ActionTile({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="glass sheen group flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
    >
      <span className="bg-ember-gradient grid size-10 place-items-center rounded-xl text-black shadow-lg">
        {icon}
      </span>
      <span className="mt-1 text-sm font-semibold text-haze">{label}</span>
      <span className="text-[11px] leading-tight text-fog">{hint}</span>
    </button>
  );
}

export function SharePeerSheet() {
  const selectedPeerId = useShareStore((s) => s.selectedPeerId);
  const peer = useShareStore((s) => s.peers.find((p) => p.id === s.selectedPeerId));
  const ready = useShareStore((s) => (selectedPeerId ? s.ready[selectedPeerId] : false));
  const snippets = useShareStore((s) => s.snippets);
  const transfers = useShareStore((s) => s.transfers);
  const remoteMedia = useShareStore((s) => s.remoteMedia);
  const outgoing = useShareStore((s) => s.outgoing);

  const { selectPeer, shareScreen, shareCamera, sendFiles, sendText, openViewer } = useAir();
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close if the selected peer disappears from the roster.
  useEffect(() => {
    if (selectedPeerId && !peer) selectPeer(null);
  }, [selectedPeerId, peer, selectPeer]);

  const open = Boolean(selectedPeerId && peer);
  const peerId = selectedPeerId as string;

  useEscapeKey(open, () => selectPeer(null));

  const incomingScreen = remoteMedia[mediaKey(peerId ?? "", "screen")];
  const incomingCamera = remoteMedia[mediaKey(peerId ?? "", "camera")];
  const incoming = incomingScreen ?? incomingCamera;
  const sharingToThisPeer = outgoing && outgoing.peerId === peerId;

  const recent = useMemo(
    () =>
      [
        ...snippets
          .filter((s) => s.peerId === peerId)
          .map((s) => ({ kind: "snippet" as const, at: s.at, data: s })),
        ...Object.values(transfers)
          .filter((t) => t.peerId === peerId)
          .map((t) => ({ kind: "transfer" as const, at: t.startedAt, data: t })),
      ]
        .sort((a, b) => b.at - a.at)
        .slice(0, 6),
    [snippets, transfers, peerId],
  );

  const handleFiles = (files: FileList | null) => {
    if (files && files.length) void sendFiles(peerId, files);
  };

  const send = () => {
    const value = text.trim();
    if (!value) return;
    void sendText(peerId, value);
    setText("");
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label="Close"
            onClick={() => selectPeer(null)}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%", opacity: 0.6, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`glass-strong sheen relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:w-[min(94vw,30rem)] sm:rounded-3xl ${
              dragging ? "ring-2 ring-[var(--color-ember)]" : ""
            }`}
          >
            {/* grab handle (mobile) */}
            <div aria-hidden className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15 sm:hidden" />

            {/* header */}
            <div className="flex items-center gap-3">
              <span
                className="grid size-12 place-items-center rounded-full text-2xl"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${peer!.color}40, transparent 70%)`,
                  border: `1px solid ${peer!.color}66`,
                }}
              >
                {peer!.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-lg font-semibold text-haze">{peer!.name}</h3>
                <p className="flex items-center gap-1.5 text-xs text-fog">
                  <DeviceIcon kind={peer!.device} className="size-3" />
                  {deviceLabel(peer!.device)}
                  <span className="mx-1 text-ash">·</span>
                  <span className={ready ? "text-[var(--color-ok)]" : "text-[var(--color-warn)]"}>
                    {ready ? "connected" : "connecting…"}
                  </span>
                </p>
              </div>
              <button
                onClick={() => selectPeer(null)}
                aria-label="Close"
                className="btn-ghost grid size-9 place-items-center rounded-full"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* live status banners */}
            {incoming ? (
              <button
                onClick={() => openViewer(mediaKey(peerId, incoming.kind))}
                className="glow-ember mt-4 flex w-full items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-left"
              >
                <Eye className="size-4 text-ember" />
                <span className="flex-1 text-sm font-medium text-haze">
                  {peer!.name} is sharing their {incoming.kind}
                </span>
                <span className="chip">Watch</span>
              </button>
            ) : null}

            {sharingToThisPeer ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3">
                <Radio className="size-4 animate-pulse text-ember" />
                <span className="flex-1 text-sm text-mist">
                  Sharing your {outgoing!.kind} to {peer!.name}
                </span>
              </div>
            ) : null}

            {/* action grid */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ActionTile
                icon={<MonitorUp className="size-5" />}
                label="Share screen"
                hint="Live mirror your screen"
                onClick={() => {
                  void shareScreen(peerId);
                  selectPeer(null);
                }}
              />
              <ActionTile
                icon={<Camera className="size-5" />}
                label="Share camera"
                hint="Stream your webcam"
                onClick={() => {
                  void shareCamera(peerId);
                  selectPeer(null);
                }}
              />
              <ActionTile
                icon={<ImageUp className="size-5" />}
                label="Send photos"
                hint="Pictures, with preview"
                onClick={() => fileRef.current?.click()}
              />
              <ActionTile
                icon={<FileUp className="size-5" />}
                label="Send files"
                hint="Any file, any size"
                onClick={() => fileRef.current?.click()}
              />
            </div>

            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* text composer */}
            <div className="glass-well mt-3 flex items-end gap-2 rounded-2xl p-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Send a message or paste a link…"
                /* text-base (16px) prevents iOS Safari auto-zoom on focus */
                className="max-h-28 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-2 text-base text-haze outline-none placeholder:text-fog"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                aria-label="Send text"
                className="btn-ember grid size-10 shrink-0 place-items-center rounded-xl disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-fog">
              Drop files anywhere on this card to send them
            </p>

            {/* recent activity with this peer */}
            {recent.length ? (
              <div className="mt-5">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-fog">
                  Recent
                </p>
                <div className="flex flex-col gap-2">
                  {recent.map((item) =>
                    item.kind === "transfer" ? (
                      <TransferRow key={item.data.id} transfer={item.data} compact />
                    ) : (
                      <div
                        key={item.data.id}
                        className="glass flex items-start gap-2 rounded-xl px-3 py-2 text-sm"
                      >
                        <span
                          className={`mt-1 size-1.5 shrink-0 rounded-full ${
                            item.data.direction === "send" ? "bg-ember" : "bg-[var(--color-ok)]"
                          }`}
                        />
                        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-mist">
                          {item.data.text}
                        </p>
                        <button
                          onClick={() => navigator.clipboard?.writeText(item.data.text)}
                          className="-mr-1 shrink-0 rounded-lg px-2 py-1.5 text-[11px] text-fog hover:bg-white/5 hover:text-haze"
                        >
                          Copy
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
