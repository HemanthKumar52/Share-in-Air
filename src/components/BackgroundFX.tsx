/**
 * The atmosphere. A fixed, non-interactive layer behind everything: a deep
 * charcoal base, one warm ember bloom and one cool tide bloom for depth, a
 * faded engineering grid, and a couple of slow-drifting blurred orbs so the
 * glass panes feel suspended in moving air.
 */
export function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Base vertical wash */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_-10%,#16161d_0%,#0b0b0e_45%,#08080a_100%)]" />

      {/* Warm ember bloom, top */}
      <div
        className="absolute -top-[28%] left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full blur-[120px] opacity-60"
        style={{ background: "radial-gradient(circle, rgba(255,122,26,0.40), rgba(255,77,61,0.16) 45%, transparent 70%)" }}
      />

      {/* Cool tide bloom, bottom-left */}
      <div
        className="absolute -bottom-[26%] -left-[12%] h-[55vh] w-[55vw] rounded-full blur-[130px] opacity-50"
        style={{ background: "radial-gradient(circle, rgba(74,108,247,0.28), rgba(56,224,200,0.10) 50%, transparent 72%)" }}
      />

      {/* Faded engineering grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(120% 90% at 50% 0%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 50% 0%, black 30%, transparent 80%)",
        }}
      />

      {/* Slow-drifting orbs */}
      <div className="absolute left-[8%] top-[22%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,157,77,0.22),transparent_70%)] blur-2xl [animation:var(--animate-float-slow)]" />
      <div className="absolute right-[12%] top-[58%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(74,108,247,0.18),transparent_70%)] blur-2xl [animation:var(--animate-float)]" />
      <div className="absolute right-[26%] top-[12%] h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(56,224,200,0.16),transparent_70%)] blur-2xl [animation:var(--animate-float-slow)]" />

      {/* Vignette to seat the content */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
