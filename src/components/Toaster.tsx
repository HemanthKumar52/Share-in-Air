"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Info, TriangleAlert, X, Sparkles } from "lucide-react";
import {
  subscribeToasts,
  dismissToast,
  type ToastItem,
  type ToastTone,
} from "@/lib/toast";

const toneIcon: Record<ToastTone, React.ReactNode> = {
  info: <Info className="size-4" />,
  success: <Check className="size-4" />,
  error: <TriangleAlert className="size-4" />,
  accent: <Sparkles className="size-4" />,
};

const toneAccent: Record<ToastTone, string> = {
  info: "text-mist",
  success: "text-[var(--color-ok)]",
  error: "text-[var(--color-bad)]",
  accent: "text-ember",
};

function ToastRow({ item }: { item: ToastItem }) {
  useEffect(() => {
    if (item.duration <= 0) return;
    const t = setTimeout(() => dismissToast(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item.id, item.duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="glass-strong sheen pointer-events-auto flex w-[min(92vw,22rem)] items-start gap-3 rounded-2xl p-3.5 pr-3"
      role="status"
    >
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-white/5 ${toneAccent[item.tone]}`}
      >
        {toneIcon[item.tone]}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold leading-tight text-haze">{item.title}</p>
        {item.body ? (
          <p className="mt-0.5 text-xs leading-snug text-fog">{item.body}</p>
        ) : null}
        {item.action ? (
          <button
            onClick={() => {
              item.action?.onClick();
              dismissToast(item.id);
            }}
            className="text-ember mt-2 text-xs font-semibold underline-offset-2 hover:underline"
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button
        onClick={() => dismissToast(item.id)}
        aria-label="Dismiss"
        className="btn-ghost grid size-7 shrink-0 place-items-center rounded-full"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2.5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:p-6"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <ToastRow key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
