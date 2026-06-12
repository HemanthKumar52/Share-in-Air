import type {
  ControlMessage,
  HubEvent,
  MediaKind,
  PeerIdentity,
  SignalMessage,
  TransferState,
} from "./types";
import {
  FILE_CHANNEL_PREFIX,
  FileAssembler,
  MAX_FILE_SIZE,
  MAX_TEXT_LENGTH,
  channelIdFromLabel,
  sendFile,
} from "./files";
import { shortId } from "./format";

/* ────────────────────────────────────────────────────────────────────────────
   PeerHub — owns one RTCPeerConnection per remote peer.

   • Connection is established eagerly and deterministically: the peer with the
     smaller id initiates (creates the "control" DataChannel + first offer), so
     exactly one connection exists per pair and either side can share once it's up.
   • The perfect-negotiation pattern keeps renegotiation (adding/removing media
     tracks) glare-free.
   • "control" channel  → JSON app protocol (hello, text, media start/stop).
   • "file:<id>" channels → one self-describing binary stream per file.
   ──────────────────────────────────────────────────────────────────────────── */

interface Peer {
  id: string;
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  control: RTCDataChannel | null;
  identity: PeerIdentity | null;
  pendingCandidates: RTCIceCandidateInit[];
  readyWaiters: Array<(peer: Peer) => void>;
  remoteKindByStream: Map<string, MediaKind>;
  pendingStreams: Map<string, MediaStream>;
  emittedStreams: Set<string>;
  streamListeners: Set<string>;
  senders: Map<MediaKind, RTCRtpSender[]>;
  fileCancels: Map<string, { v: boolean }>;
}

function defaultIceServers(): RTCIceServer[] {
  const base: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const extra = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (extra) {
    try {
      const parsed = JSON.parse(extra);
      if (Array.isArray(parsed)) return [...base, ...(parsed as RTCIceServer[])];
    } catch {
      /* ignore malformed config */
    }
  }
  return base;
}

export class PeerHub {
  private peers = new Map<string, Peer>();
  private iceServers = defaultIceServers();
  private localMedia = new Map<MediaKind, MediaStream>();
  private transferUrls = new Map<string, string>(); // transferId -> object URL

  constructor(
    private identity: PeerIdentity,
    private sendSignal: (msg: SignalMessage) => void,
    private emit: (event: HubEvent) => void,
  ) {}

  /* ── roster sync ─────────────────────────────────────────────────────────── */

  /** Reconcile against the current presence roster. */
  sync(peerIds: string[]) {
    const set = new Set(peerIds);
    for (const id of peerIds) {
      if (id === this.identity.id) continue;
      if (this.identity.id < id) this.connect(id); // we initiate to higher ids
    }
    for (const id of [...this.peers.keys()]) {
      if (!set.has(id)) this.forget(id);
    }
  }

  private connect(peerId: string): Peer {
    const existing = this.peers.get(peerId);
    if (existing) return existing;
    const peer = this.createPeer(peerId);
    const channel = peer.pc.createDataChannel("control");
    this.setupControl(peer, channel);
    return peer;
  }

  private createPeer(peerId: string): Peer {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: Peer = {
      id: peerId,
      pc,
      polite: this.identity.id > peerId, // higher id yields on collision
      makingOffer: false,
      ignoreOffer: false,
      control: null,
      identity: null,
      pendingCandidates: [],
      readyWaiters: [],
      remoteKindByStream: new Map(),
      pendingStreams: new Map(),
      emittedStreams: new Set(),
      streamListeners: new Set(),
      senders: new Map(),
      fileCancels: new Map(),
    };
    this.peers.set(peerId, peer);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.sendSignal({ kind: "candidate", from: this.identity.id, to: peerId, candidate: candidate.toJSON() });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.sendSignal({ kind: "offer", from: this.identity.id, to: peerId, sdp: pc.localDescription });
        }
      } catch (err) {
        console.error("[air] negotiation failed", err);
      } finally {
        peer.makingOffer = false;
      }
    };

    pc.onconnectionstatechange = () => {
      this.emit({ type: "peer-state", peerId, state: pc.connectionState });
      if (pc.connectionState === "failed") {
        try {
          pc.restartIce();
        } catch {
          /* not supported everywhere */
        }
      }
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      if (!stream) return;
      this.handleRemoteStream(peer, stream);
    };

    pc.ondatachannel = (ev) => this.attachChannel(peer, ev.channel);

    return peer;
  }

  private forget(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    try {
      peer.control?.close();
    } catch {
      /* ignore */
    }
    try {
      peer.pc.close();
    } catch {
      /* ignore */
    }
    this.peers.delete(peerId);
    this.emit({ type: "peer-state", peerId, state: "closed" });
    this.emit({ type: "remote-media-ended", peerId, kind: "screen" });
    this.emit({ type: "remote-media-ended", peerId, kind: "camera" });
  }

  /* ── signaling in ────────────────────────────────────────────────────────── */

  async handleSignal(msg: SignalMessage) {
    let peer = this.peers.get(msg.from);
    if (!peer) {
      if (msg.kind === "bye") return;
      peer = this.createPeer(msg.from); // inbound — we're the answerer
    }
    const pc = peer.pc;

    try {
      if (msg.kind === "bye") {
        this.forget(msg.from);
        return;
      }

      if (msg.kind === "offer" || msg.kind === "answer") {
        const description = msg.sdp;
        if (!description) return;
        const collision =
          description.type === "offer" && (peer.makingOffer || pc.signalingState !== "stable");
        peer.ignoreOffer = !peer.polite && collision;
        if (peer.ignoreOffer) return;

        await pc.setRemoteDescription(description);
        await this.flushCandidates(peer);

        if (description.type === "offer") {
          await pc.setLocalDescription();
          if (pc.localDescription) {
            this.sendSignal({ kind: "answer", from: this.identity.id, to: msg.from, sdp: pc.localDescription });
          }
        }
      } else if (msg.kind === "candidate" && msg.candidate) {
        if (!pc.remoteDescription) {
          peer.pendingCandidates.push(msg.candidate);
        } else {
          try {
            await pc.addIceCandidate(msg.candidate);
          } catch (err) {
            if (!peer.ignoreOffer) console.warn("[air] addIceCandidate failed", err);
          }
        }
      }
    } catch (err) {
      console.error("[air] handleSignal error", err);
    }
  }

  private async flushCandidates(peer: Peer) {
    const queued = peer.pendingCandidates;
    peer.pendingCandidates = [];
    for (const candidate of queued) {
      try {
        await peer.pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("[air] flush candidate failed", err);
      }
    }
  }

  /* ── data channels ───────────────────────────────────────────────────────── */

  private attachChannel(peer: Peer, channel: RTCDataChannel) {
    const fileId = channelIdFromLabel(channel.label);
    if (fileId) {
      this.receiveFile(peer, channel);
    } else if (channel.label === "control") {
      this.setupControl(peer, channel);
    }
  }

  private setupControl(peer: Peer, channel: RTCDataChannel) {
    peer.control = channel;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => {
      this.sendControl(peer, { t: "hello", identity: this.identity });
      this.emit({ type: "ready", peerId: peer.id });
      const waiters = peer.readyWaiters;
      peer.readyWaiters = [];
      for (const w of waiters) w(peer);
    };
    channel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as ControlMessage;
        this.onControl(peer, msg);
      } catch {
        /* ignore malformed control */
      }
    };
  }

  private onControl(peer: Peer, msg: ControlMessage) {
    switch (msg.t) {
      case "hello":
        peer.identity = msg.identity;
        break;
      case "text": {
        if (typeof msg.text !== "string") break;
        const text = msg.text.slice(0, MAX_TEXT_LENGTH); // clamp hostile/huge payloads
        this.emit({
          type: "text",
          snippet: { id: String(msg.id), peerId: peer.id, direction: "recv", text, at: Number(msg.at) || Date.now() },
        });
        break;
      }
      case "media-start":
        peer.remoteKindByStream.set(msg.streamId, msg.kind);
        if (peer.pendingStreams.has(msg.streamId)) {
          const stream = peer.pendingStreams.get(msg.streamId)!;
          peer.pendingStreams.delete(msg.streamId);
          this.emitRemoteMedia(peer, stream, msg.kind);
        }
        break;
      case "media-stop":
        this.emit({ type: "remote-media-ended", peerId: peer.id, kind: msg.kind });
        break;
      case "watch-request":
        // a viewer opted in — start sending them our live broadcast
        void this.addViewer(peer.id, msg.kind);
        break;
      case "watch-stop":
        this.removeViewer(peer.id, msg.kind);
        break;
    }
  }

  private sendControl(peer: Peer, msg: ControlMessage) {
    if (peer.control?.readyState === "open") {
      peer.control.send(JSON.stringify(msg));
    }
  }

  /* ── remote media ────────────────────────────────────────────────────────── */

  private handleRemoteStream(peer: Peer, stream: MediaStream) {
    const known = peer.remoteKindByStream.get(stream.id);
    if (known) {
      this.emitRemoteMedia(peer, stream, known);
    } else {
      // kind not announced yet — hold until media-start arrives
      peer.pendingStreams.set(stream.id, stream);
    }
    // A stream can surface multiple tracks (video + audio) → multiple ontrack
    // events. Attach the removetrack listener only once per stream.
    if (!peer.streamListeners.has(stream.id)) {
      peer.streamListeners.add(stream.id);
      stream.addEventListener("removetrack", () => {
        if (stream.getTracks().length === 0) {
          const kind = peer.remoteKindByStream.get(stream.id) ?? "screen";
          this.emit({ type: "remote-media-ended", peerId: peer.id, kind });
        }
      });
    }
  }

  private emitRemoteMedia(peer: Peer, stream: MediaStream, kind: MediaKind) {
    if (peer.emittedStreams.has(stream.id)) return;
    peer.emittedStreams.add(stream.id);
    this.emit({
      type: "remote-media",
      media: { peerId: peer.id, kind, stream, hasAudio: stream.getAudioTracks().length > 0 },
    });
  }

  /* ── public actions ──────────────────────────────────────────────────────── */

  identityOf(peerId: string): PeerIdentity | null {
    return this.peers.get(peerId)?.identity ?? null;
  }

  private ensureConnected(peerId: string, timeoutMs = 12000): Promise<Peer> {
    const peer = this.peers.get(peerId);
    if (peer?.control?.readyState === "open") return Promise.resolve(peer);
    if (this.identity.id < peerId) this.connect(peerId);
    const target = this.peers.get(peerId);
    return new Promise<Peer>((resolve, reject) => {
      const live = target ?? this.peers.get(peerId);
      if (!live) {
        // we're waiting on the lower-id peer to initiate
        const poll = setInterval(() => {
          const p = this.peers.get(peerId);
          if (p?.control?.readyState === "open") {
            clearInterval(poll);
            clearTimeout(timer);
            resolve(p);
          }
        }, 150);
        const timer = setTimeout(() => {
          clearInterval(poll);
          reject(new Error("peer unreachable"));
        }, timeoutMs);
        return;
      }
      live.readyWaiters.push(resolve);
      const timer = setTimeout(() => {
        live.readyWaiters = live.readyWaiters.filter((w) => w !== resolve);
        reject(new Error("peer unreachable"));
      }, timeoutMs);
    });
  }

  async sendText(peerId: string, rawText: string) {
    const text = rawText.slice(0, MAX_TEXT_LENGTH);
    const peer = await this.ensureConnected(peerId);
    const id = shortId("m");
    const at = Date.now();
    this.sendControl(peer, { t: "text", id, text, at });
    this.emit({ type: "text", snippet: { id, peerId, direction: "send", text, at } });
  }

  async sendFiles(peerId: string, files: File[]) {
    const peer = await this.ensureConnected(peerId);
    for (const file of files) {
      this.sendOneFile(peer, file);
    }
  }

  private sendOneFile(peer: Peer, file: File) {
    const id = shortId("f");
    const mime = file.type || "application/octet-stream";
    const base: TransferState = {
      id,
      peerId: peer.id,
      direction: "send",
      name: file.name,
      size: file.size,
      mime,
      transferred: 0,
      status: "active",
      startedAt: Date.now(),
    };
    this.emit({ type: "transfer", transfer: base });

    const channel = peer.pc.createDataChannel(`${FILE_CHANNEL_PREFIX}${id}`);
    channel.binaryType = "arraybuffer";
    const cancel = { v: false };
    peer.fileCancels.set(id, cancel);

    const run = () => {
      sendFile(
        channel,
        file,
        { id, name: file.name, size: file.size, mime },
        (sent) => this.emit({ type: "transfer", transfer: { ...base, transferred: sent } }),
        () => cancel.v,
      )
        .then(() => {
          this.emit({ type: "transfer", transfer: { ...base, transferred: file.size, status: "done" } });
          setTimeout(() => {
            try {
              channel.close();
            } catch {
              /* ignore */
            }
          }, 300);
        })
        .catch(() => {
          this.emit({ type: "transfer", transfer: { ...base, status: cancel.v ? "canceled" : "error" } });
          try {
            channel.close();
          } catch {
            /* ignore */
          }
        })
        .finally(() => peer.fileCancels.delete(id));
    };

    if (channel.readyState === "open") run();
    else channel.onopen = run;
  }

  cancelTransfer(peerId: string, transferId: string) {
    const cancel = this.peers.get(peerId)?.fileCancels.get(transferId);
    if (cancel) cancel.v = true;
  }

  private receiveFile(peer: Peer, channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer";
    const assembler = new FileAssembler();
    let base: TransferState | null = null;
    let rejected = false;

    channel.onmessage = (e) => {
      if (rejected) return;
      const done = assembler.accept(e.data as string | ArrayBuffer);
      if (assembler.header && !base) {
        const size = assembler.header.size;
        // Reject the peer's claim before buffering any chunks (anti-DoS).
        if (!Number.isFinite(size) || size < 0 || size > MAX_FILE_SIZE) {
          rejected = true;
          try {
            channel.close();
          } catch {
            /* ignore */
          }
          return;
        }
        base = {
          id: String(assembler.header.id),
          peerId: peer.id,
          direction: "recv",
          name: String(assembler.header.name || "file"),
          size,
          mime: String(assembler.header.mime || "application/octet-stream"),
          transferred: 0,
          status: "active",
          startedAt: Date.now(),
        };
        this.emit({ type: "transfer", transfer: base });
      }
      if (base) {
        this.emit({ type: "transfer", transfer: { ...base, transferred: assembler.received } });
      }
      if (done && base) {
        const blob = assembler.toBlob();
        const url = URL.createObjectURL(blob);
        this.transferUrls.set(base.id, url);
        this.emit({
          type: "transfer",
          transfer: { ...base, transferred: base.size, status: "done", url },
        });
        try {
          channel.close();
        } catch {
          /* ignore */
        }
      }
    };

    channel.onclose = () => {
      if (!rejected && base && assembler.received < (assembler.header?.size ?? Infinity)) {
        this.emit({ type: "transfer", transfer: { ...base, status: "error" } });
      }
    };
  }

  /** Revoke and forget a received file's object URL (called on eviction/save cleanup). */
  revokeTransferUrl(transferId: string) {
    const url = this.transferUrls.get(transferId);
    if (url) {
      URL.revokeObjectURL(url);
      this.transferUrls.delete(transferId);
    }
  }

  /* ── Broadcast / presenter model ─────────────────────────────────────────
     The host captures once and holds the stream. Viewers OPT IN by sending a
     watch-request; only then does the host add the track to that viewer. No
     pairing required and nobody receives the stream unless they ask. */

  /** Begin presenting: hold the captured stream as the broadcast source. */
  startLocalMedia(kind: MediaKind, stream: MediaStream) {
    if (this.localMedia.has(kind)) this.stopLocalMedia(kind);
    this.localMedia.set(kind, stream);
  }

  /** Send the live stream to one viewer (in response to their watch-request). */
  private async addViewer(peerId: string, kind: MediaKind) {
    const stream = this.localMedia.get(kind);
    if (!stream) return;
    const peer = await this.ensureConnected(peerId);
    if (peer.senders.has(kind)) return; // already watching
    const senders: RTCRtpSender[] = [];
    for (const track of stream.getTracks()) {
      senders.push(peer.pc.addTrack(track, stream));
    }
    peer.senders.set(kind, senders);
    this.sendControl(peer, {
      t: "media-start",
      kind,
      streamId: stream.id,
      hasAudio: stream.getAudioTracks().length > 0,
    });
    this.emit({ type: "viewers", kind, count: this.viewerCount(kind) });
  }

  private removeViewer(peerId: string, kind: MediaKind) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    const senders = peer.senders.get(kind);
    if (senders) {
      for (const sender of senders) {
        try {
          peer.pc.removeTrack(sender);
        } catch {
          /* ignore */
        }
      }
      peer.senders.delete(kind);
    }
    this.sendControl(peer, { t: "media-stop", kind });
    this.emit({ type: "viewers", kind, count: this.viewerCount(kind) });
  }

  /** How many viewers are currently receiving this broadcast. */
  viewerCount(kind: MediaKind): number {
    let n = 0;
    for (const peer of this.peers.values()) if (peer.senders.has(kind)) n++;
    return n;
  }

  /** Stop presenting: drop all viewers and release the capture. */
  stopLocalMedia(kind: MediaKind) {
    for (const peer of this.peers.values()) {
      if (peer.senders.has(kind)) this.removeViewer(peer.id, kind);
    }
    const stream = this.localMedia.get(kind);
    stream?.getTracks().forEach((t) => t.stop());
    this.localMedia.delete(kind);
  }

  /** Viewer side: ask a presenting peer to start sending us their live media. */
  async requestWatch(peerId: string, kind: MediaKind) {
    const peer = await this.ensureConnected(peerId);
    this.sendControl(peer, { t: "watch-request", kind });
  }

  /** Viewer side: tell the presenter we've stopped watching. */
  stopWatch(peerId: string, kind: MediaKind) {
    const peer = this.peers.get(peerId);
    if (peer) this.sendControl(peer, { t: "watch-stop", kind });
  }

  localStream(kind: MediaKind): MediaStream | undefined {
    return this.localMedia.get(kind);
  }

  destroy() {
    for (const peer of this.peers.values()) {
      this.sendSignal({ kind: "bye", from: this.identity.id, to: peer.id });
      try {
        peer.pc.close();
      } catch {
        /* ignore */
      }
    }
    for (const stream of this.localMedia.values()) {
      stream.getTracks().forEach((t) => t.stop());
    }
    for (const url of this.transferUrls.values()) URL.revokeObjectURL(url);
    this.transferUrls.clear();
    this.peers.clear();
    this.localMedia.clear();
  }
}
