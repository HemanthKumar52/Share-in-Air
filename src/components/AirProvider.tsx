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
import { toast } from "@/lib/toast";
import type { HubEvent, MediaKind, PeerIdentity, TransferState } from "@/lib/types";
import { mediaKey, useShareStore } from "@/store/useShareStore";

export interface AirActions {
  selectPeer: (peerId: string | null) => void;
  shareScreen: (peerId: string) => Promise<void>;
  shareCamera: (peerId: string) => Promise<void>;
  stopOutgoing: () => void;
  sendFiles: (peerId: string, files: File[] | FileList) => Promise<void>;
  sendText: (peerId: string, text: string) => Promise<void>;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  openViewer: (key: string | null) => void;
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
            toast.success(`Received ${event.transfer.name}`, {
              body: `from ${peerName(event.transfer.peerId)}`,
              action: { label: "Save", onClick: () => downloadTransfer(event.transfer) },
            });
          }
          break;
        }
        case "remote-media": {
          const key = mediaKey(event.media.peerId, event.media.kind);
          s.setRemoteMedia(key, event.media);
          s.setViewer(key);
          toast.accent(`${peerName(event.media.peerId)} is sharing their ${event.media.kind}`, {
            action: { label: "View", onClick: () => useShareStore.getState().setViewer(key) },
          });
          break;
        }
        case "remote-media-ended":
          s.removeRemoteMedia(mediaKey(event.peerId, event.kind));
          break;
      }
    };

    const hub = new PeerHub(identity, (msg) => transport.send(msg), reduce);
    hubRef.current = hub;

    transport.onSignal((msg) => void hub.handleSignal(msg));
    transport.onRoster((peers) => {
      if (disposed) return;
      store().setPeers(peers);
      hub.sync(peers.map((p) => p.id));
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

    const startShare = async (peerId: string, kind: MediaKind) => {
      const hub = getHub();
      if (!hub) return;
      if (sharingLock.current) return; // serialize: ignore overlapping share attempts
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

        // Stop any prior outgoing share first (one live share at a time).
        const prev = useShareStore.getState().outgoing;
        if (prev) {
          hub.stopMedia(prev.peerId, prev.kind);
        }

        await hub.shareMedia(peerId, kind, stream);
        useShareStore.getState().setOutgoing({ peerId, kind, stream });

        // If the user ends capture from the browser's own UI, sync our state.
        for (const track of stream.getVideoTracks()) {
          track.addEventListener("ended", () => {
            const cur = useShareStore.getState().outgoing;
            if (cur && cur.stream === stream) {
              hub.stopMedia(cur.peerId, cur.kind);
              useShareStore.getState().setOutgoing(null);
            }
          });
        }
        toast.success(`Sharing your ${kind}`, { body: `to ${peerName(peerId)}` });
      } catch (err) {
        if ((err as DOMException)?.name === "NotAllowedError") return; // user canceled the picker
        toast.error(`Couldn't start ${kind} share`, {
          body: (err as Error)?.message ?? "Unknown error",
        });
      } finally {
        sharingLock.current = false;
      }
    };

    return {
      selectPeer: (peerId) => useShareStore.getState().selectPeer(peerId),
      shareScreen: (peerId) => startShare(peerId, "screen"),
      shareCamera: (peerId) => startShare(peerId, "camera"),
      stopOutgoing: () => {
        const hub = getHub();
        const cur = useShareStore.getState().outgoing;
        if (hub && cur) hub.stopMedia(cur.peerId, cur.kind);
        useShareStore.getState().setOutgoing(null);
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
      openViewer: (key) => useShareStore.getState().setViewer(key),
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
