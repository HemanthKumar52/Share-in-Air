"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import type { PresenceMeta } from "@/lib/types";
import { DeviceIcon, deviceLabel } from "./DeviceIcon";

export function PeerAvatar({
  peer,
  ready,
  onClick,
  style,
  floatDelay = 0,
}: {
  peer: PresenceMeta;
  ready: boolean;
  onClick: () => void;
  style?: CSSProperties;
  floatDelay?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.94 }}
      className="group flex w-[88px] flex-col items-center gap-2 outline-none sm:w-[104px]"
      aria-label={`Share with ${peer.name}`}
    >
      <span
        className="relative grid size-[60px] place-items-center rounded-full text-2xl transition-shadow duration-300 sm:size-[72px] sm:text-3xl"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${peer.color}33, ${peer.color}10 60%, transparent 75%)`,
          border: `1px solid ${peer.color}55`,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 10px 28px -12px ${peer.color}88`,
          animation: `var(--animate-float)`,
          animationDelay: `${floatDelay}s`,
        }}
      >
        {/* soft inner glass */}
        <span className="absolute inset-1 rounded-full bg-white/[0.03] backdrop-blur-sm" />
        <span className="relative drop-shadow">{peer.emoji}</span>
        {/* readiness dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[var(--color-void)] ${
            ready ? "bg-[var(--color-ok)]" : "animate-pulse bg-[var(--color-warn)]"
          }`}
          title={ready ? "Connected" : "Connecting…"}
        />
        {/* LIVE badge when presenting */}
        {peer.presenting ? (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-bad)] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-md">
            ● Live
          </span>
        ) : null}
      </span>

      <span className="flex max-w-full flex-col items-center">
        <span className="max-w-full truncate text-[13px] font-semibold leading-tight text-haze">
          {peer.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-fog">
          <DeviceIcon kind={peer.device} className="size-3" />
          {deviceLabel(peer.device)}
        </span>
      </span>
    </motion.button>
  );
}
