import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Share in Air — share your screen, photos, files and text over WiFi, no app";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background: "radial-gradient(120% 95% at 50% -10%, #17171f 0%, #0b0b0e 48%, #08080a 100%)",
          color: "#f4f3f6",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* warm bloom */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: 360,
            width: 700,
            height: 500,
            background: "radial-gradient(circle, rgba(255,122,26,0.45), rgba(255,77,61,0.12) 45%, transparent 70%)",
            filter: "blur(40px)",
            display: "flex",
          }}
        />

        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <svg width="76" height="76" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="22" stroke="#ff7a1a" strokeWidth="6" fill="none" />
            <path
              d="M32 21 L32 44 M32 21 L24 29 M32 21 L40 29"
              stroke="#fff"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Share in Air</div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 82, fontWeight: 800, lineHeight: 1.04, marginTop: 46, maxWidth: 960, letterSpacing: -2 }}>
          Share your screen &amp; files over&nbsp;
          <span style={{ color: "#ff7a1a" }}>WiFi</span>
        </div>

        <div style={{ display: "flex", fontSize: 33, color: "#b9b8c2", marginTop: 26, maxWidth: 900 }}>
          Peer-to-peer. No app, no account, no uploads.
        </div>

        {/* feature chips */}
        <div style={{ display: "flex", gap: 16, marginTop: 46 }}>
          {["Screen", "Camera", "Photos & files", "Text"].map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                fontSize: 26,
                color: "#e9e8ee",
                padding: "12px 24px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
