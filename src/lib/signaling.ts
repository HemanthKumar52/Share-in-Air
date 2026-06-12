import type { DeviceKind, MediaKind, PeerIdentity, PresenceMeta, SignalMessage } from "./types";
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
  const presenting =
    r.presenting === "screen" || r.presenting === "camera" ? (r.presenting as MediaKind) : null;
  return { id: r.id, name, color, emoji, device, joinedAt, presenting };
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

export type TransportMode = "supabase" | "public" | "local";

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

/* ── Public MQTT relay room (zero-config cross-device default) ─────────────── */
/* When no Supabase project is configured we still want real cross-device
   sharing. A free public MQTT broker (reached over secure WebSocket, so it works
   on HTTPS/Vercel) acts as the rendezvous: presence + signaling ride pub/sub
   topics namespaced by room. Only tiny SDP/ICE messages pass through it — media
   and files still flow strictly peer-to-peer. */

// Public, no-signup broker. Secure WebSocket endpoint (required on HTTPS).
const MQTT_URL = "wss://broker.emqx.io:8084/mqtt";

type MqttClient = {
  on: (e: string, cb: (...a: unknown[]) => void) => void;
  removeListener: (e: string, cb: (...a: unknown[]) => void) => void;
  subscribe: (t: string[], o: unknown, cb: () => void) => void;
  unsubscribe: (t: string[]) => void;
  publish: (t: string, m: string) => void;
};

let mqttClientPromise: Promise<MqttClient | null> | null = null;

function getMqttClient(): Promise<MqttClient | null> {
  if (!mqttClientPromise) {
    mqttClientPromise = (async () => {
      try {
        const mod = await import("mqtt");
        const mqtt = (mod as unknown as { default?: { connect: (u: string, o: unknown) => MqttClient } }).default ?? (mod as unknown as { connect: (u: string, o: unknown) => MqttClient });
        const client = mqtt.connect(MQTT_URL, {
          clientId: `sia_${Math.random().toString(16).slice(2, 10)}`,
          clean: true,
          keepalive: 30,
          reconnectPeriod: 3000,
          connectTimeout: 8000,
          protocolVersion: 4,
        });
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          client.on("connect", finish);
          client.on("error", finish);
          setTimeout(finish, 9000); // never block the app indefinitely
        });
        return client;
      } catch (err) {
        console.error("[air] MQTT relay unavailable", err);
        return null;
      }
    })();
  }
  return mqttClientPromise;
}

function mqttRoom(room: string, identity: PeerIdentity, ev: RoomEvents): RoomChannel {
  let meta: PresenceMeta = { ...identity, joinedAt: Date.now() };
  const presenceTopic = `sia/${room}/p`;
  const signalTopic = `sia/${room}/s`;
  const seen = new Map<string, { meta: PresenceMeta; at: number }>();
  let client: MqttClient | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

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
    peers.push(meta); // self — Transport filters it out
    ev.onRoster(room, peers);
  };

  const announce = () =>
    client?.publish(presenceTopic, JSON.stringify({ kind: "announce", meta }));

  const onMessage = (...args: unknown[]) => {
    const topic = args[0] as string;
    const payload = args[1] as { toString(): string };
    if (topic !== presenceTopic && topic !== signalTopic) return;
    let data: LocalWire | { kind: "hello"; from: string };
    try {
      data = JSON.parse(payload.toString());
    } catch {
      return;
    }
    if (topic === presenceTopic) {
      if (data.kind === "announce") {
        const m = sanitizePresence(data.meta);
        if (m && m.id !== identity.id) {
          seen.set(m.id, { meta: m, at: Date.now() });
          emit();
        }
      } else if (data.kind === "leave") {
        if (data.from && seen.delete(data.from)) emit();
      } else if (data.kind === "hello") {
        if (data.from !== identity.id) announce();
      }
    } else if (topic === signalTopic) {
      if (data.kind === "signal" && isValidSignal(data.msg) && data.msg.to === identity.id) {
        ev.onSignal(data.msg);
      }
    }
  };

  const ready = (async () => {
    client = await getMqttClient();
    if (!client) return; // relay unreachable — app still loads, just no peers
    client.on("message", onMessage);
    await new Promise<void>((res) =>
      client!.subscribe([presenceTopic, signalTopic], { qos: 0 }, () => res()),
    );
    announce();
    client.publish(presenceTopic, JSON.stringify({ kind: "hello", from: identity.id }));
    heartbeat = setInterval(() => {
      announce();
      emit();
    }, HEARTBEAT_MS);
  })();

  return {
    name: room,
    ready,
    send: (msg) => client?.publish(signalTopic, JSON.stringify({ kind: "signal", msg })),
    retrack: (next) => {
      meta = next;
      announce();
      emit();
    },
    close: () => {
      if (heartbeat) clearInterval(heartbeat);
      try {
        client?.publish(presenceTopic, JSON.stringify({ kind: "leave", from: identity.id }));
        client?.unsubscribe([presenceTopic, signalTopic]);
        client?.removeListener("message", onMessage);
      } catch {
        /* ignore */
      }
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
    } else if (typeof WebSocket !== "undefined") {
      // Default: zero-config public relay so cross-device sharing just works.
      this.mode = "public";
      this.factory = mqttRoom;
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

  private presenting: MediaKind | null = null;

  private currentMeta(): PresenceMeta {
    return { ...this.identity, presenting: this.presenting, joinedAt: Date.now() };
  }

  private broadcastMeta(): void {
    const meta = this.currentMeta();
    for (const ch of this.rooms.values()) ch.retrack(meta);
  }

  /** Re-publish presence after the local identity's cosmetic half changes. */
  retrack(identity: PeerIdentity): void {
    this.identity = identity;
    this.broadcastMeta();
  }

  /** Announce (or clear) that this device is presenting live media. */
  setPresenting(kind: MediaKind | null): void {
    this.presenting = kind;
    this.broadcastMeta();
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
