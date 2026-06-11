import type { ElementType, ReactNode } from "react";

/** A consistent frosted-glass surface. `tone` picks the material weight. */
export function GlassPanel({
  children,
  className = "",
  tone = "base",
  sheen = true,
  as: Tag = "div",
}: {
  children?: ReactNode;
  className?: string;
  tone?: "base" | "strong" | "well";
  sheen?: boolean;
  as?: ElementType;
}) {
  const toneClass = tone === "strong" ? "glass-strong" : tone === "well" ? "glass-well" : "glass";
  return (
    <Tag className={`relative overflow-hidden ${toneClass} ${sheen ? "sheen" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
