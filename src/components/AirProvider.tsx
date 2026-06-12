"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createIdentity, rerollCosmetic } from "@/lib/identity";
import { Transport, hashToRoom } from "@/lib/signaling";
import { PeerHub } from "@/lib/webrtc";
import { isImage } from "@/lib/files";
import { toast } from "@/lib/toast";
import type { HubEvent, MediaKind, PeerIdentity, TransferState } from "@/lib/types";
import { mediaKey, useShareStore } from "@/store/useShareStore";
import { useUiStore } from "@/store/useUiStore";

export type QuickShareKind = "screen" | "camera" | "files" | "text";

export interface AirActions {
  selectPeer: (peerId: string | null) => void;
  /** Start presenting your screen/camera to the room — no pairing required. */
  startBroadcast: (kind: MediaKind) => Promise<void>;
  stopBroadcast: () => void;
  /** Opt in to watch a presenting peer's live media. */
  watchPeer: (peerId: string, kind: MediaKind) => void;
  /** Close the live viewer (and tell the presenter we stopped watching). */
  closeViewer: () => void;
  sendFiles: (peerId: string, files: File[] | FileList) => Promise<void>;
  sendText: (peerId: string, text: string) => Promise<void>;
  /** Entry point from the hero buttons: screen/camera present; files/text are directed. */
  quickShare: (kind: QuickShareKind) => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  cancelTransfer: (peerId: string, id: string) => void;
  saveTransfer: (transfer: TransferState) => void;
  rerollIdentity: () => void;
}

const AirContext = createContext<AirActions | null>(null);

export function useAir(): AirActions {
  const ctx = useContext(AirContext);
  if (!ctx) throw new Error("useAir must be used within <AirProvider>");
  return ctx;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars
function makeCode(len = 4): string {
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function peerName(peerId: string): string {
  return useShareStore.getState().peers.find((p) => p.id === peerId)?.name ?? "A device";
}

function downloadTransfer(transfer: TransferState) {
  if (!transfer.url) return;
  const a = document.createElement("a");
  a.href = transfer.url;
  a.download = transfer.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function AirProvider({ children }: { children: ReactNode }) {
  const transportRef = useRef<Transport | null>(null);
  const hubRef = useRef<PeerHub | null>(null);
  const identityRef = useRef<PeerIdentity | null>(null);
  const sharingLock = useRef(false);

  useEffect(() => {
    let disposed = false;
    const store = useShareStore.getState;

    const identity = createIdentity();
    identityRef.current = identity;
    store().setIdentity(identity);
    store().setStatus("connecting");

    const transport = new Transport(identity);
    transportRef.current = transport;
    store().setMode(transport.mode);

    const reduce = (event: HubEvent) => {
      const s = store();
      switch (event.type) {
        case "peer-state":
          if (event.state === "closed" || event.state === "failed") s.setReady(event.peerId, false);
          break;
        case "ready":
          s.setReady(event.peerId, true);
          break;
        case "text": {
          s.addSnippet(event.snippet);
          if (event.snippet.direction === "recv") {
            toast.accent(`${peerName(event.snippet.peerId)} sent text`, {
              body: event.snippet.text.slice(0, 90),
              action: {
                label: "Copy",
                onClick: () => navigator.clipboard?.writeText(event.snippet.text),
              },
            });
          }
          break;
        }
        case "transfer": {
          s.upsertTransfer(event.transfer);
          // Bound memory: evict oldest finished transfers past a cap, freeing URLs.
          const all = Object.values(useShareStore.getState().transfers);
          if (all.length > 60) {
            const finished = all
              .filter((t) => t.status !== "active")
              .sort((a, b) => a.startedAt - b.startedAt);
            const removeCount = all.length - 60;
            for (let i = 0; i < removeCount && i < finished.length; i++) {
              hubRef.current?.revokeTransferUrl(finished[i].id);
              useShareStore.getState().clearTransfer(finished[i].id);
            }
          }
          if (event.transfer.direction === "recv" && event.transfer.status === "done") {
            if (isImage(event.transfer.mime) && event.transfer.url) {
              // Photos open immediately in the lightbox so you can actually see them.
              s.setPreview(event.transfer.id);
            } else {
              toast.success(`Received ${event.transfer.name}`, {
                body: `from ${peerName(event.transfer.peerId)}`,
                action: { label: "Save", onClick: () => downloadTransfer(event.transfer) },
              });
            }
          }
          break;
        }
        case "remote-media": {
          // Arrives only because we asked to watch — open the stage.
          const key = mediaKey(event.media.peerId, event.media.kind);
          s.setRemoteMedia(key, event.media);
          s.setViewer(key);
          break;
        }
        case "remote-media-ended":
          s.removeRemoteMedia(mediaKey(event.peerId, event.kind));
          break;
        case "viewers": {
          const b = useShareStore.getState().broadcast;
          if (b && b.kind === event.kind) s.setWatchers(event.count);
          break;
        }
      }
    };

    const hub = new PeerHub(identity, (msg) => transport.send(msg), reduce);
    hubRef.current = hub;

    transport.onSignal((msg) => void hub.handleSignal(msg));
    const presentingSeen = new Set<string>();
    transport.onRoster((peers) => {
      if (disposed) return;
      store().setPeers(peers);
      hub.sync(peers.map((p) => p.id));
      // Opt-in watch prompt: notify once when a peer starts presenting.
      const live = new Set<string>();
      for (const p of peers) {
        if (p.presenting) {
          live.add(p.id);
          if (!presentingSeen.has(p.id)) {
            const kind = p.presenting;
            toast.accent(`${p.name} is presenting their ${kind}`, {
              duration: 9000,
              action: { label: "Watch", onClick: () => void hub.requestWatch(p.id, kind) },
            });
          }
        }
      }
      presentingSeen.clear();
      for (const id of live) presentingSeen.add(id);
    });

    // Join the auto network room (group by hashed public IP), then any ?room= code.
    (async () => {
      try {
        const res = await fetch("/api/ip", { cache: "no-store" });
        const { ip } = (await res.json()) as { ip: string };
        const room = `net:${await hashToRoom(ip || "local")}`;
        if (disposed) return;
        await transport.addRoom(room);
        store().setNetworkRoom(room);
      } catch {
        const room = `net:${await hashToRoom("local")}`;
        if (!disposed) {
          await transport.addRoom(room);
          store().setNetworkRoom(room);
        }
      }
      if (!disposed) store().setStatus("ready");

      const params = new URLSearchParams(window.location.search);
      const code = params.get("room");
      if (code && !disposed) {
        const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        if (clean) {
          await transport.addRoom(`room:${clean}`);
          store().setRoomCode(clean);
        }
      }
    })();

    const onUnload = () => hub.destroy();
    window.addEventListener("pagehide", onUnload);

    return () => {
      disposed = true;
      window.removeEventListener("pagehide", onUnload);
      hub.destroy();
      transport.destroy();
      useShareStore.getState().reset();
    };
  }, []);

  const actions = useMemo<AirActions>(() => {
    const getHub = () => hubRef.current;
    const getTransport = () => transportRef.current;

    const doStopBroadcast = () => {
      const hub = getHub();
      const cur = useShareStore.getState().broadcast;
      if (hub && cur) hub.stopLocalMedia(cur.kind);
      useShareStore.getState().setBroadcast(null);
      useShareStore.getState().setWatchers(0);
      getTransport()?.setPresenting(null);
    };

    const startBroadcast = async (kind: MediaKind) => {
      const hub = getHub();
      if (!hub) return;
      if (sharingLock.current) return; // serialize overlapping attempts
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        toast.error("Capture needs a secure (HTTPS) context", {
          body: "Open the deployed https:// site or localhost.",
        });
        return;
      }
      sharingLock.current = true;
      try {
        const stream =
          kind === "screen"
            ? await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: 30, max: 60 } },
                audio: true,
              })
            : await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true,
              });

        // One broadcast at a time — replace any prior one.
        const prev = useShareStore.getState().broadcast;
        if (prev) hub.stopLocalMedia(prev.kind);

        hub.startLocalMedia(kind, stream);
        useShareStore.getState().setBroadcast({ kind, stream });
        getTransport()?.setPresenting(kind); // tell the room we're live

        // If the user ends capture from the browser's own UI, sync our state.
        for (const track of stream.getVideoTracks()) {
          track.addEventListener("ended", () => {
            const cur = useShareStore.getState().broadcast;
            if (cur && cur.stream === stream) doStopBroadcast();
          });
        }

        const nearby = useShareStore.getState().peers.length;
        toast.success(`You're presenting your ${kind}`, {
          body: nearby > 0 ? "Anyone nearby can tap to watch." : "Share the room code so others can watch.",
        });
      } catch (err) {
        if ((err as DOMException)?.name === "NotAllowedError") return; // user canceled the picker
        toast.error(`Couldn't start ${kind}`, {
          body: (err as Error)?.message ?? "Unknown error",
        });
      } finally {
        sharingLock.current = false;
      }
    };

    return {
      selectPeer: (peerId) => useShareStore.getState().selectPeer(peerId),
      startBroadcast,
      stopBroadcast: doStopBroadcast,
      watchPeer: (peerId, kind) => {
        const hub = getHub();
        if (!hub) return;
        hub.requestWatch(peerId, kind).catch(() =>
          toast.error("Couldn't reach that device", { body: "It may have stopped presenting." }),
        );
        toast.info(`Connecting to ${peerName(peerId)}'s ${kind}…`);
      },
      closeViewer: () => {
        const key = useShareStore.getState().viewerKey;
        if (key) {
          const [peerId, kind] = key.split(":");
          getHub()?.stopWatch(peerId, kind as MediaKind);
          useShareStore.getState().removeRemoteMedia(key);
        }
        useShareStore.getState().setViewer(null);
      },
      sendFiles: async (peerId, files) => {
        const hub = getHub();
        if (!hub) return;
        const list = Array.from(files as ArrayLike<File>);
        if (list.length === 0) return;
        try {
          await hub.sendFiles(peerId, list);
        } catch {
          toast.error("That device isn't ready yet", { body: "Wait for it to connect, then retry." });
        }
      },
      sendText: async (peerId, text) => {
        const hub = getHub();
        if (!hub || !text.trim()) return;
        try {
          await hub.sendText(peerId, text.trim());
        } catch {
          toast.error("That device isn't ready yet", { body: "Wait for it to connect, then retry." });
        }
      },
      quickShare: (kind) => {
        // Screen & camera are broadcasts — start immediately, no device required.
        if (kind === "screen" || kind === "camera") {
          void startBroadcast(kind);
          return;
        }
        // Files & text are directed to a specific device.
        const peers = useShareStore.getState().peers;
        if (peers.length === 0) {
          toast.info("No device to send to yet", {
            body: "Open this link on another device on the same WiFi, or share a room code.",
          });
          useUiStore.getState().setRoomModalOpen(true);
          return;
        }
        if (peers.length > 1) {
          toast.info("Tap the device you want to send to", {
            body: "Choose one of the devices below.",
          });
          return;
        }
        const peer = peers[0];
        if (kind === "text") useShareStore.getState().selectPeer(peer.id);
        else if (kind === "files") {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.onchange = () => {
            if (input.files?.length) {
              getHub()
                ?.sendFiles(peer.id, Array.from(input.files))
                .catch(() =>
                  toast.error("That device isn't ready yet", {
                    body: "Wait for it to connect, then retry.",
                  }),
                );
            }
          };
          input.click();
        }
      },
      createRoom: () => {
        const transport = getTransport();
        if (!transport) return;
        const existing = useShareStore.getState().roomCode;
        const code = existing ?? makeCode();
        void transport.addRoom(`room:${code}`);
        useShareStore.getState().setRoomCode(code);
        const url = new URL(window.location.href);
        url.searchParams.set("room", code);
        window.history.replaceState({}, "", url.toString());
      },
      joinRoom: (code) => {
        const transport = getTransport();
        if (!transport) return;
        const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        if (!clean) return;
        void transport.addRoom(`room:${clean}`);
        useShareStore.getState().setRoomCode(clean);
        const url = new URL(window.location.href);
        url.searchParams.set("room", clean);
        window.history.replaceState({}, "", url.toString());
        toast.info(`Joined room ${clean}`);
      },
      leaveRoom: () => {
        const transport = getTransport();
        const code = useShareStore.getState().roomCode;
        if (transport && code) void transport.removeRoom(`room:${code}`);
        useShareStore.getState().setRoomCode(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("room");
        window.history.replaceState({}, "", url.toString());
      },
      cancelTransfer: (peerId, id) => getHub()?.cancelTransfer(peerId, id),
      saveTransfer: (transfer) => downloadTransfer(transfer),
      rerollIdentity: () => {
        const cosmetic = rerollCosmetic();
        const cur = identityRef.current;
        if (!cur) return;
        const next: PeerIdentity = { ...cur, ...cosmetic };
        identityRef.current = next;
        useShareStore.getState().setIdentity(next);
        getTransport()?.retrack(next);
      },
    };
  }, []);

  return <AirContext.Provider value={actions}>{children}</AirContext.Provider>;
}
