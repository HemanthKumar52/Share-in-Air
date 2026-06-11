import type { DeviceKind, PeerIdentity, PresenceMeta, SignalMessage } from "./types";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/* ── Untrusted-input guards ────────────────────────────────────────────────────
   Presence metadata and signaling payloads arrive from other peers and cannot be
   trusted. We clamp/validate them before use — notably `color`, which is later
   interpolated into inline CSS (so an unvalidated value would be a CSS-injection
   vector), and `name`, which is rendered and could be arbitrarily long. */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DEVICE_KINDS = new Set<DeviceKind>(["mobile", "tablet", "laptop", "desktop", "unknown"]);
const SIGNAL_KINDS = new Set(["offer", "answer", "candidate", "bye"]);

function sanitizePresence(raw: unknown): PresenceMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id.length === 0 || r.id.length > 100) return null;
  const name =
    typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 40) : "Device";
  const color = typeof r.color === "string" && HEX_COLOR.test(r.color) ? r.color : "#FF7A1A";
  const emoji =
    typeof r.emoji === "string" && r.emoji ? Array.from(r.emoji).slice(0, 2).join("") : "✦";
  const device =
    typeof r.device === "string" && DEVICE_KINDS.has(r.device as DeviceKind)
      ? (r.device as DeviceKind)
      : "unknown";
  const joinedAt =
    typeof r.joinedAt === "number" && Number.isFinite(r.joinedAt) ? r.joinedAt : Date.now();
  return { id: r.id, name, color, emoji, device, joinedAt };
}

function isValidSignal(raw: unknown): raw is SignalMessage {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.kind === "string" &&
    SIGNAL_KINDS.has(r.kind) &&
    typeof r.from === "string" &&
    typeof r.to === "string"
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Signaling transport.

   Responsibilities:
     • Presence — who else is in each "room" (the auto network room and/or a
       manual code room), surfaced as a single merged, de-duplicated roster.
     • Broadcast — deliver tiny WebRTC signaling messages (SDP / ICE) addressed
       to a specific peer.

   Two interchangeable backends behind one `Transport`:
     • Supabase Realtime — works across devices on the same WiFi (and beyond),
       socket runs browser → Supabase so it's Vercel-friendly.
     • BroadcastChannel — zero-config fallback that links tabs on ONE machine,
       for instant local demos.
   ──────────────────────────────────────────────────────────────────────────── */

export type TransportMode = "supabase" | "local";

interface RoomEvents {
  onRoster: (room: string, peers: PresenceMeta[]) => void;
  onSignal: (msg: SignalMessage) => void;
}

interface RoomChannel {
  readonly name: string;
  readonly ready: Promise<void>;
  send: (msg: SignalMessage) => void;
  retrack: (meta: PresenceMeta) => void;
  close: () => void;
}

type RoomFactory = (room: string, identity: PeerIdentity, ev: RoomEvents) => RoomChannel;

/* ── Supabase room ──────────────────────────────────────────────────────────── */

function supabaseRoom(room: string, identity: PeerIdentity, ev: RoomEvents): RoomChannel {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  let meta: PresenceMeta = { ...identity, joinedAt: Date.now() };
  const channel: RealtimeChannel = supabase.channel(`air:${room}`, {
    config: { presence: { key: identity.id }, broadcast: { self: false, ack: false } },
  });

  const readRoster = () => {
    const state = channel.presenceState<PresenceMeta>();
    const peers: PresenceMeta[] = [];
    for (const key of Object.keys(state)) {
      const entries = state[key];
      const meta = entries && entries[0] ? sanitizePresence(entries[0]) : null;
      if (meta) peers.push(meta);
    }
    ev.onRoster(room, peers);
  };

  channel.on("presence", { event: "sync" }, readRoster);
  channel.on("presence", { event: "join" }, readRoster);
  channel.on("presence", { event: "leave" }, readRoster);
  channel.on("broadcast", { event: "signal" }, ({ payload }) => {
    if (isValidSignal(payload) && payload.to === identity.id) ev.onSignal(payload);
  });

  const ready = new Promise<void>((resolve) => {
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track(meta);
        readRoster();
        resolve();
      }
    });
  });

  return {
    name: room,
    ready,
    send: (msg) => {
      void channel.send({ type: "broadcast", event: "signal", payload: msg });
    },
    retrack: (next) => {
      meta = next;
      void channel.track(meta);
    },
    close: () => {
      void channel.untrack();
      void getSupabase()?.removeChannel(channel);
    },
  };
}

/* ── Local BroadcastChannel room (same-machine demo) ───────────────────────── */

type LocalWire =
  | { kind: "announce"; meta: PresenceMeta }
  | { kind: "hello"; from: string }
  | { kind: "leave"; from: string }
  | { kind: "signal"; msg: SignalMessage };

const HEARTBEAT_MS = 2500;
const EXPIRE_MS = 7000;

function localRoom(room: string, identity: PeerIdentity, ev: RoomEvents): RoomChannel {
  let meta: PresenceMeta = { ...identity, joinedAt: Date.now() };
  const bc = new BroadcastChannel(`air:${room}`);
  const seen = new Map<string, { meta: PresenceMeta; at: number }>();

  const emit = () => {
    const now = Date.now();
    const peers: PresenceMeta[] = [];
    for (const [id, rec] of seen) {
      if (now - rec.at > EXPIRE_MS) {
        seen.delete(id);
        continue;
      }
      peers.push(rec.meta);
    }
    // include self so the merge logic upstream is uniform (it filters self out)
    peers.push(meta);
    ev.onRoster(room, peers);
  };

  const announce = () => bc.postMessage({ kind: "announce", meta } satisfies LocalWire);

  bc.onmessage = (e: MessageEvent<LocalWire>) => {
    const data = e.data;
    if (!data) return;
    switch (data.kind) {
      case "announce": {
        const meta = sanitizePresence(data.meta);
        if (meta) {
          seen.set(meta.id, { meta, at: Date.now() });
          emit();
        }
        break;
      }
      case "hello":
        // a newcomer asked who's here — reply so it learns us immediately
        if (data.from !== identity.id) announce();
        break;
      case "leave":
        if (seen.delete(data.from)) emit();
        break;
      case "signal":
        if (isValidSignal(data.msg) && data.msg.to === identity.id) ev.onSignal(data.msg);
        break;
    }
  };

  announce();
  bc.postMessage({ kind: "hello", from: identity.id } satisfies LocalWire);
  const heartbeat = setInterval(() => {
    announce();
    emit();
  }, HEARTBEAT_MS);

  const ready = Promise.resolve();

  return {
    name: room,
    ready,
    send: (msg) => bc.postMessage({ kind: "signal", msg } satisfies LocalWire),
    retrack: (next) => {
      meta = next;
      announce();
      emit();
    },
    close: () => {
      clearInterval(heartbeat);
      try {
        bc.postMessage({ kind: "leave", from: identity.id } satisfies LocalWire);
      } catch {
        /* channel may already be closing */
      }
      bc.close();
    },
  };
}

/* ── Transport: merges rooms into one roster and routes signals ────────────── */

export class Transport {
  readonly mode: TransportMode;
  private factory: RoomFactory;
  private rooms = new Map<string, RoomChannel>();
  private rosters = new Map<string, PresenceMeta[]>();
  private peerRoom = new Map<string, string>();
  private rosterCb: (peers: PresenceMeta[]) => void = () => {};
  private signalCb: (msg: SignalMessage) => void = () => {};

  constructor(private identity: PeerIdentity) {
    if (isSupabaseConfigured()) {
      this.mode = "supabase";
      this.factory = supabaseRoom;
    } else {
      this.mode = "local";
      this.factory = localRoom;
    }
  }

  onRoster(cb: (peers: PresenceMeta[]) => void) {
    this.rosterCb = cb;
  }

  onSignal(cb: (msg: SignalMessage) => void) {
    this.signalCb = cb;
  }

  hasRoom(room: string): boolean {
    return this.rooms.has(room);
  }

  roomNames(): string[] {
    return [...this.rooms.keys()];
  }

  async addRoom(room: string): Promise<void> {
    if (this.rooms.has(room)) return;
    const ch = this.factory(room, this.identity, {
      onRoster: (r, peers) => this.handleRoster(r, peers),
      onSignal: (msg) => this.signalCb(msg),
    });
    this.rooms.set(room, ch);
    await ch.ready;
  }

  async removeRoom(room: string): Promise<void> {
    const ch = this.rooms.get(room);
    if (!ch) return;
    ch.close();
    this.rooms.delete(room);
    this.rosters.delete(room);
    for (const [peer, r] of this.peerRoom) {
      if (r === room) this.peerRoom.delete(peer);
    }
    this.emitRoster();
  }

  /** Re-publish presence after the local identity's cosmetic half changes. */
  retrack(identity: PeerIdentity): void {
    this.identity = identity;
    const meta: PresenceMeta = { ...identity, joinedAt: Date.now() };
    for (const ch of this.rooms.values()) ch.retrack(meta);
  }

  send(msg: SignalMessage): void {
    const room = this.peerRoom.get(msg.to);
    const ch = room ? this.rooms.get(room) : undefined;
    if (ch) {
      ch.send(msg);
    } else {
      // unknown location — fan out to every room
      for (const c of this.rooms.values()) c.send(msg);
    }
  }

  destroy(): void {
    for (const ch of this.rooms.values()) ch.close();
    this.rooms.clear();
    this.rosters.clear();
    this.peerRoom.clear();
  }

  private handleRoster(room: string, peers: PresenceMeta[]) {
    this.rosters.set(room, peers);
    for (const p of peers) {
      if (p.id !== this.identity.id) this.peerRoom.set(p.id, room);
    }
    this.emitRoster();
  }

  private emitRoster() {
    const merged = new Map<string, PresenceMeta>();
    for (const peers of this.rosters.values()) {
      for (const p of peers) {
        if (p.id === this.identity.id) continue; // never list self
        const existing = merged.get(p.id);
        if (!existing || p.joinedAt < existing.joinedAt) merged.set(p.id, p);
      }
    }
    this.rosterCb([...merged.values()].sort((a, b) => a.joinedAt - b.joinedAt));
  }
}

/** Hash a string (e.g. public IP) into a short, stable, non-reversible room id. */
export async function hashToRoom(input: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(`air-net:${input}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest).slice(0, 8);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback non-crypto hash
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
}
