<div align="center">

# Share in Air

**Send a live screen, photos, files and text to any device on the same WiFi.**
Peer-to-peer over WebRTC — no uploads, no accounts, no media ever touches a server.
A glassy, AirDrop-style web app built with open source only.

</div>

---

## ✦ What it does

- **Live screen share** — stream your screen to a peer in real time (`getDisplayMedia`).
- **Camera / webcam share** — share a live camera feed (`getUserMedia`).
- **Photos & files** — drag-drop or pick; sent in chunks over a WebRTC DataChannel with live progress and image previews.
- **Text & clipboard** — fire quick text snippets across devices, one tap to copy.
- **Auto same-WiFi discovery** — every device on your network appears as a floating avatar (Snapdrop-style), grouped by a hash of your public IP.
- **Room code + QR** — also join deliberately with a short code or a scan, even across networks.

Everything is **end-to-end peer-to-peer**: only tiny signaling messages (SDP offers/answers and ICE candidates) pass through the cloud. The actual screen, camera, files and text travel directly between devices — on the same WiFi they never leave your LAN.

## ✦ Stack (100% open source)

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS v4 + a hand-built glassmorphism design system |
| Realtime signaling | Supabase Realtime (Broadcast + Presence) — open source & self-hostable |
| Live media + files | WebRTC (perfect-negotiation) + DataChannel |
| State / motion / icons / QR | Zustand · Motion · lucide-react · qrcode.react |

> **Why Supabase for signaling?** Vercel can't host a long-lived WebSocket server. Supabase Realtime's socket runs *browser → Supabase*, so signaling works on Vercel while media stays peer-to-peer. The whole Supabase stack is open source if you'd rather self-host. No tables or rows are used — only ephemeral Realtime channels.

## ✦ Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

**Zero-config demo:** without any environment variables the app runs in *local demo mode* — a `BroadcastChannel` transport links multiple **tabs on the same machine** so you can try the full flow (discovery, screen share, file/text transfer) immediately.

**Real cross-device (same WiFi):** create a free Supabase project (or self-host), then copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Restart, then open the app on your phone and laptop **on the same WiFi** — they'll discover each other automatically.

> Browsers only expose screen/camera capture in a **secure context**. `localhost` counts as secure, and Vercel serves HTTPS in production — so you're covered. (Opening a raw `http://192.168.x.x` LAN address from another device will *not* allow capture; use the deployed HTTPS URL, or the room code/QR from the deployed site.)

## ✦ Deploy to Vercel

1. Push this repo to GitHub (already wired to `Share-in-Air`).
2. Import it at [vercel.com/new](https://vercel.com/new) — framework auto-detected as Next.js.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars (or install the **Supabase** integration from the Vercel Marketplace to auto-provision them).
4. Deploy. Every push to `main` auto-deploys.

## ✦ How it fits together

```
            Supabase Realtime  (signaling only: presence + SDP/ICE)
                   ▲   ▲
   browser A ──────┘   └────── browser B          ← tiny control messages
       │                           │
       └────────── WebRTC ─────────┘              ← screen / camera / files / text
              (direct, P2P, stays on your LAN)
```

- `src/lib/signaling.ts` — pluggable transport: Supabase Realtime, or BroadcastChannel fallback.
- `src/lib/webrtc.ts` — per-peer `RTCPeerConnection` with the perfect-negotiation pattern, a control DataChannel, and media track management.
- `src/lib/files.ts` — chunking, backpressure and reassembly for file transfer.
- `src/hooks/useSession.ts` — wires identity → signaling → presence → peers → store.
- `src/app/page.tsx` — the glass UI: discovery radar, share sheet, live viewer, transfers dock, room/QR.

## ✦ Privacy

No database writes. No file uploads. No analytics. Signaling messages are ephemeral and only contain WebRTC negotiation data. Your public IP is **hashed** before it's used to group same-network devices.

## ✦ License

MIT.
