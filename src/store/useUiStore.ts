import { create } from "zustand";

interface UiStore {
  roomModalOpen: boolean;
  transfersOpen: boolean;
  setRoomModalOpen: (open: boolean) => void;
  setTransfersOpen: (open: boolean) => void;
  toggleTransfers: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  roomModalOpen: false,
  transfersOpen: false,
  setRoomModalOpen: (roomModalOpen) => set({ roomModalOpen }),
  setTransfersOpen: (transfersOpen) => set({ transfersOpen }),
  toggleTransfers: () => set((s) => ({ transfersOpen: !s.transfersOpen })),
}));
