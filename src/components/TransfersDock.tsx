"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownUp, Inbox, X } from "lucide-react";
import { useShareStore } from "@/store/useShareStore";
import { useUiStore } from "@/store/useUiStore";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { TransferRow } from "./TransferRow";

export function TransfersDock() {
  const open = useUiStore((s) => s.transfersOpen);
  const setOpen = useUiStore((s) => s.setTransfersOpen);
  const transfers = useShareStore((s) => s.transfers);

  useEscapeKey(open, () => setOpen(false));

  const list = Object.values(transfers).sort((a, b) => b.startedAt - a.startedAt);
  const active = list.filter((t) => t.status === "active");
  const finished = list.filter((t) => t.status !== "active");

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label="Close transfers"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="glass-strong sheen relative z-10 flex h-full w-full max-w-sm flex-col p-5 pt-[max(1.25rem,env(safe-area-inset-top))]"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-haze">
                <ArrowDownUp className="size-5 text-ember" />
                Transfers
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="btn-ghost grid size-9 place-items-center rounded-full"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
              {list.length === 0 ? (
                <div className="mt-16 flex flex-col items-center gap-3 text-center">
                  <span className="grid size-14 place-items-center rounded-2xl bg-white/5">
                    <Inbox className="size-6 text-fog" />
                  </span>
                  <p className="text-sm text-mist">No transfers yet</p>
                  <p className="max-w-[16rem] text-xs text-fog">
                    Files and photos you send or receive will show up here, with progress and a
                    save button.
                  </p>
                </div>
              ) : null}

              {active.length ? (
                <section>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-fog">
                    In progress
                  </p>
                  <div className="space-y-2">
                    {active.map((t) => (
                      <TransferRow key={t.id} transfer={t} />
                    ))}
                  </div>
                </section>
              ) : null}

              {finished.length ? (
                <section>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-fog">
                    Recent
                  </p>
                  <div className="space-y-2">
                    {finished.map((t) => (
                      <TransferRow key={t.id} transfer={t} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
