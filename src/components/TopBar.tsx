"use client";

import { ArrowDownUp, QrCode, Users } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useUiStore } from "@/store/useUiStore";

function Mark() {
  return (
    <span className="relative grid size-9 place-items-center">
      <svg viewBox="0 0 64 64" className="size-9" aria-hidden>
        <defs>
          <linearGradient id="hr" x1="14" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFB661" />
            <stop offset="50%" stopColor="#FF7A1A" />
            <stop offset="100%" stopColor="#FF4D3D" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="16" stroke="url(#hr)" strokeWidth="4.5" fill="none" />
        <path
          d="M32 24 L32 41 M32 24 L26 30 M32 24 L38 30"
          stroke="#fff"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute inset-0 -z-10 rounded-full blur-md" style={{ background: "radial-gradient(circle,#ff7a1a55,transparent 70%)" }} />
    </span>
  );
}

export function TopBar() {
  const peers = useShareStore((s) => s.peers);
  const roomCode = useShareStore((s) => s.roomCode);
  const transfers = useShareStore((s) => s.transfers);
  const setRoomModalOpen = useUiStore((s) => s.setRoomModalOpen);
  const toggleTransfers = useUiStore((s) => s.toggleTransfers);

  const activeCount = Object.values(transfers).filter((t) => t.status === "active").length;

  return (
    <header className="sticky top-0 z-30 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
      <div className="glass sheen mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full px-3 py-2 pr-2.5 sm:px-4">
        <div className="flex items-center gap-2.5">
          <Mark />
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold tracking-tight text-haze sm:text-base">
              Share <span className="text-ember-gradient">in Air</span>
            </p>
            <p className="hidden text-[11px] text-fog sm:block">peer-to-peer over your WiFi</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {peers.length > 0 ? (
            <span className="chip hidden sm:inline-flex">
              <Users className="size-3.5" />
              {peers.length} nearby
            </span>
          ) : null}

          <button
            onClick={() => setRoomModalOpen(true)}
            className="btn-ghost inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium"
          >
            <QrCode className="size-4" />
            <span className="hidden sm:inline">{roomCode ? `Room ${roomCode}` : "Room"}</span>
            {roomCode ? (
              <span className="font-mono text-xs text-ember sm:hidden">{roomCode}</span>
            ) : null}
          </button>

          <button
            onClick={toggleTransfers}
            className="btn-ghost relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium"
            aria-label="Transfers"
          >
            <ArrowDownUp className="size-4" />
            {activeCount > 0 ? (
              <span className="bg-ember-gradient absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full text-[10px] font-bold text-black">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
