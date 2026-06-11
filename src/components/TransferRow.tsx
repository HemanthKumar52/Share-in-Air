"use client";

import { useState } from "react";
import { Check, Download, File as FileIcon, Image as ImageIcon, X } from "lucide-react";
import type { TransferState } from "@/lib/types";
import { formatBytes, formatPercent } from "@/lib/format";
import { isImage } from "@/lib/files";
import { useAir } from "./AirProvider";

export function TransferRow({
  transfer,
  compact = false,
}: {
  transfer: TransferState;
  compact?: boolean;
}) {
  const { saveTransfer, cancelTransfer } = useAir();
  const [thumbBroken, setThumbBroken] = useState(false);
  const percent = formatPercent(transfer.transferred, transfer.size);
  const image = isImage(transfer.mime);
  const done = transfer.status === "done";
  const failed = transfer.status === "error" || transfer.status === "canceled";
  const canSave = done && transfer.direction === "recv" && transfer.url;
  const showThumb = canSave && image && !thumbBroken;

  return (
    <div className="glass flex items-center gap-3 rounded-xl p-2.5">
      {/* thumb / icon */}
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/5">
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={transfer.url}
            alt={transfer.name}
            className="size-full object-cover"
            onError={() => setThumbBroken(true)}
          />
        ) : image ? (
          <ImageIcon className="size-4 text-fog" />
        ) : (
          <FileIcon className="size-4 text-fog" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-medium text-haze">{transfer.name}</p>
          <span className="shrink-0 text-[11px] tabular-nums text-fog">
            {failed
              ? transfer.status
              : done
                ? formatBytes(transfer.size)
                : `${formatBytes(transfer.transferred)} / ${formatBytes(transfer.size)}`}
          </span>
        </div>

        {/* progress / status line */}
        {done ? (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-ok)]">
            <Check className="size-3" />
            {transfer.direction === "recv" ? "Received" : "Sent"}
            <span className="text-fog">· {transfer.direction === "recv" ? "from" : "to"} peer</span>
          </div>
        ) : failed ? (
          <div className="mt-1 text-[11px] text-[var(--color-bad)]">
            {transfer.status === "canceled" ? "Canceled" : "Transfer failed"}
          </div>
        ) : (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="bg-ember-gradient h-full rounded-full transition-[width] duration-150"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      {/* trailing action */}
      {canSave ? (
        <button
          onClick={() => saveTransfer(transfer)}
          aria-label="Save file"
          className="btn-ember grid size-9 shrink-0 place-items-center rounded-lg"
        >
          <Download className="size-4" />
        </button>
      ) : transfer.status === "active" && transfer.direction === "send" && !compact ? (
        <button
          onClick={() => cancelTransfer(transfer.peerId, transfer.id)}
          aria-label="Cancel"
          className="btn-ghost grid size-9 shrink-0 place-items-center rounded-lg"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
