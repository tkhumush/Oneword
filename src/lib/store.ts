import { create } from "zustand";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { LongFormNote } from "./nostr";

interface AppState {
  // Auth
  user: NDKUser | null;
  isConnected: boolean;
  setUser: (user: NDKUser | null) => void;
  setConnected: (connected: boolean) => void;

  // Active article
  activeArticle: LongFormNote | null;
  setActiveArticle: (article: LongFormNote | null) => void;

  // Speed reading
  isSpeedReading: boolean;
  speedWPM: number;
  setSpeedReading: (active: boolean) => void;
  setSpeedWPM: (wpm: number) => void;

  // Search
  isSearching: boolean;
  setSearching: (searching: boolean) => void;
  searchError: string | null;
  setSearchError: (error: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isConnected: false,
  setUser: (user) => set({ user }),
  setConnected: (connected) => set({ isConnected: connected }),

  activeArticle: null,
  setActiveArticle: (article) => set({ activeArticle: article }),

  isSpeedReading: false,
  speedWPM: 300,
  setSpeedReading: (active) => set({ isSpeedReading: active }),
  setSpeedWPM: (wpm) => set({ speedWPM: wpm }),

  isSearching: false,
  setSearching: (searching) => set({ isSearching: searching }),
  searchError: null,
  setSearchError: (error) => set({ searchError: error }),
}));
