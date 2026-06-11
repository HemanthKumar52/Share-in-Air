"use client";

import { Shuffle, Wifi, MonitorPlay } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useAir } from "./AirProvider";
import { DeviceIcon } from "./DeviceIcon";

/** The central "you" hero: your avatar inside a breathing halo of pulse rings. */
export function DeviceBadge() {
  const identity = useShareStore((s) => s.identity);
  const mode = useShareStore((s) => s.mode);
  const status = useShareStore((s) => s.status);
  const { rerollIdentity } = useAir();

  if (!identity) {
    return <div className="size-[124px] animate-pulse rounded-full bg-white/5" />;
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* radar pulse rings */}
      <div className="pointer-events-none absolute left-1/2 top-[62px] -translate-x-1/2 -translate-y-1/2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 size-[124px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-ember)]/30"
            style={{ animation: "var(--animate-pulse-ring)", animationDelay: `${i * 1.05}s` }}
          />
        ))}
      </div>

      <div className="relative">
        <span
          className="relative grid size-[124px] place-items-center rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${identity.color}40, ${identity.color}14 55%, transparent 72%)`,
            border: `1px solid ${identity.color}66`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 50px -10px ${identity.color}aa`,
          }}
        >
          <span className="absolute inset-2 rounded-full bg-white/[0.03] backdrop-blur-md" />
          <span className="relative text-5xl drop-shadow-lg">{identity.emoji}</span>
        </span>

        <button
          onClick={rerollIdentity}
          className="btn-ghost absolute -right-1 bottom-1 grid size-9 place-items-center rounded-full"
          aria-label="Shuffle my name & look"
          title="Shuffle my identity"
        >
          <Shuffle className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center text-center">
        <span className="chip mb-2 uppercase tracking-wide">
          <DeviceIcon kind={identity.device} className="size-3" /> This device
        </span>
        <h2 className="font-display text-2xl font-semibold text-haze">{identity.name}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-fog">
          {mode === "local" ? (
            <>
              <MonitorPlay className="size-3.5" />
              Local demo — links tabs on this machine
            </>
          ) : (
            <>
              <Wifi className="size-3.5 text-ember" />
              {status === "ready" ? "Visible to devices on your WiFi" : "Tuning in…"}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
