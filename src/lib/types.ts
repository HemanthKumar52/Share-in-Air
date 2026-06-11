/* Shared contracts for identity, signaling, the DataChannel control protocol,
   and transfer state. Everything in the app speaks these types. */

export type DeviceKind = "mobile" | "tablet" | "laptop" | "desktop" | "unknown";

/** A device's public identity for this session. Regenerated each load. */
export interface PeerIdentity {
  id: string; // unique session id
  name: string; // friendly two-word handle, e.g. "Amber Falcon"
  device: DeviceKind;
  color: string; // avatar accent (hex)
  emoji: string; // avatar glyph
}

/** What we publish to Supabase Presence so others can discover us. */
export interface PresenceMeta extends PeerIdentity {
  joinedAt: number;
}

/* ── Signaling (passes through Supabase Broadcast / the fallback bus) ──────── */

export type SignalKind = "offer" | "answer" | "candidate" | "bye";

export interface SignalMessage {
  kind: SignalKind;
  from: string; // sender peer id
  to: string; // recipient peer id
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit | null;
}

/* ── Media ────────────────────────────────────────────────────────────────── */

export type MediaKind = "screen" | "camera";

/* ── DataChannel control protocol (JSON over the "control" channel) ───────── */

export type ControlMessage =
  | { t: "hello"; identity: PeerIdentity }
  | { t: "text"; id: string; text: string; at: number }
  | { t: "media-start"; kind: MediaKind; streamId: string; hasAudio: boolean }
  | { t: "media-stop"; kind: MediaKind };

/* ── Transfers (UI-facing) ────────────────────────────────────────────────── */

export type TransferDirection = "send" | "recv";
export type TransferStatus = "active" | "done" | "error" | "canceled";

export interface TransferState {
  id: string;
  peerId: string;
  direction: TransferDirection;
  name: string;
  size: number;
  mime: string;
  transferred: number;
  status: TransferStatus;
  startedAt: number;
  /** object URL once a received file is complete (recv only) */
  url?: string;
}

/** A text snippet received from (or sent to) a peer. */
export interface Snippet {
  id: string;
  peerId: string;
  direction: TransferDirection;
  text: string;
  at: number;
}

/** Remote live media currently being received from a peer. */
export interface RemoteMedia {
  peerId: string;
  kind: MediaKind;
  stream: MediaStream;
  hasAudio: boolean;
}

/* ── Hub events (emitted by the WebRTC PeerHub to the session hook) ────────── */

export type HubEvent =
  | { type: "peer-state"; peerId: string; state: RTCPeerConnectionState }
  | { type: "ready"; peerId: string } // control channel open
  | { type: "text"; snippet: Snippet }
  | { type: "transfer"; transfer: TransferState }
  | { type: "remote-media"; media: RemoteMedia }
  | { type: "remote-media-ended"; peerId: string; kind: MediaKind };
