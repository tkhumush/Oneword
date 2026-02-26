import { create } from "zustand";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { LongFormNote } from "./nostr";

interface AppState {
  // Auth
  user: NDKUser | null;
  isConnected: boolean;
  setUser: (user: NDKUser | null) => void;
  setConnected: (connected: boolean) => void;

  // Feed
  followingNotes: LongFormNote[];
  setFollowingNotes: (notes: LongFormNote[]) => void;

  // Active article
  activeArticle: LongFormNote | null;
  setActiveArticle: (article: LongFormNote | null) => void;

  // Speed reading
  isSpeedReading: boolean;
  speedWPM: number;
  setSpeedReading: (active: boolean) => void;
  setSpeedWPM: (wpm: number) => void;

  // Loading state
  isLoadingFollowing: boolean;
  setLoadingFollowing: (loading: boolean) => void;

  // Search
  isSearching: boolean;
  setSearching: (searching: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isConnected: false,
  setUser: (user) => set({ user }),
  setConnected: (connected) => set({ isConnected: connected }),

  followingNotes: [],
  setFollowingNotes: (notes) => set({ followingNotes: notes }),

  activeArticle: null,
  setActiveArticle: (article) => set({ activeArticle: article }),

  isSpeedReading: false,
  speedWPM: 300,
  setSpeedReading: (active) => set({ isSpeedReading: active }),
  setSpeedWPM: (wpm) => set({ speedWPM: wpm }),

  isLoadingFollowing: false,
  setLoadingFollowing: (loading) => set({ isLoadingFollowing: loading }),

  isSearching: false,
  setSearching: (searching) => set({ isSearching: searching }),
}));
