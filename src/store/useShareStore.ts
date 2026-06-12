import { create } from "zustand";
import type {
  MediaKind,
  PeerIdentity,
  PresenceMeta,
  RemoteMedia,
  Snippet,
  TransferState,
} from "@/lib/types";
import type { TransportMode } from "@/lib/signaling";

export type SignalStatus = "idle" | "connecting" | "ready";

export function mediaKey(peerId: string, kind: MediaKind): string {
  return `${peerId}:${kind}`;
}

interface Broadcast {
  kind: MediaKind;
  stream: MediaStream;
}

interface ShareStore {
  identity: PeerIdentity | null;
  mode: TransportMode | null;
  status: SignalStatus;
  networkRoom: string | null;
  roomCode: string | null;

  peers: PresenceMeta[];
  ready: Record<string, boolean>;
  selectedPeerId: string | null;

  transfers: Record<string, TransferState>;
  snippets: Snippet[];
  remoteMedia: Record<string, RemoteMedia>;
  viewerKey: string | null;
  broadcast: Broadcast | null;
  watchers: number;
  /** transfer id of the received image currently open in the lightbox */
  previewId: string | null;

  setIdentity: (id: PeerIdentity) => void;
  setMode: (mode: TransportMode) => void;
  setStatus: (status: SignalStatus) => void;
  setNetworkRoom: (room: string | null) => void;
  setRoomCode: (code: string | null) => void;

  setPeers: (peers: PresenceMeta[]) => void;
  setReady: (peerId: string, ready: boolean) => void;
  selectPeer: (peerId: string | null) => void;

  upsertTransfer: (transfer: TransferState) => void;
  clearTransfer: (id: string) => void;
  addSnippet: (snippet: Snippet) => void;

  setRemoteMedia: (key: string, media: RemoteMedia) => void;
  removeRemoteMedia: (key: string) => void;
  setViewer: (key: string | null) => void;
  setBroadcast: (b: Broadcast | null) => void;
  setWatchers: (n: number) => void;
  setPreview: (id: string | null) => void;

  reset: () => void;
}

export const useShareStore = create<ShareStore>((set) => ({
  identity: null,
  mode: null,
  status: "idle",
  networkRoom: null,
  roomCode: null,

  peers: [],
  ready: {},
  selectedPeerId: null,

  transfers: {},
  snippets: [],
  remoteMedia: {},
  viewerKey: null,
  broadcast: null,
  watchers: 0,
  previewId: null,

  setIdentity: (identity) => set({ identity }),
  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),
  setNetworkRoom: (networkRoom) => set({ networkRoom }),
  setRoomCode: (roomCode) => set({ roomCode }),

  setPeers: (peers) => set({ peers }),
  setReady: (peerId, ready) =>
    set((s) => ({ ready: { ...s.ready, [peerId]: ready } })),
  selectPeer: (selectedPeerId) => set({ selectedPeerId }),

  upsertTransfer: (transfer) =>
    set((s) => ({ transfers: { ...s.transfers, [transfer.id]: transfer } })),
  clearTransfer: (id) =>
    set((s) => {
      const next = { ...s.transfers };
      delete next[id];
      return { transfers: next };
    }),
  addSnippet: (snippet) =>
    set((s) => ({ snippets: [...s.snippets, snippet].slice(-200) })),

  setRemoteMedia: (key, media) =>
    set((s) => ({ remoteMedia: { ...s.remoteMedia, [key]: media } })),
  removeRemoteMedia: (key) =>
    set((s) => {
      const next = { ...s.remoteMedia };
      delete next[key];
      return {
        remoteMedia: next,
        viewerKey: s.viewerKey === key ? null : s.viewerKey,
      };
    }),
  setViewer: (viewerKey) => set({ viewerKey }),
  setBroadcast: (broadcast) => set({ broadcast }),
  setWatchers: (watchers) => set({ watchers }),
  setPreview: (previewId) => set({ previewId }),

  reset: () =>
    set({
      peers: [],
      ready: {},
      selectedPeerId: null,
      transfers: {},
      snippets: [],
      remoteMedia: {},
      viewerKey: null,
      broadcast: null,
      watchers: 0,
      previewId: null,
    }),
}));
