import { create } from "zustand";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { LongFormNote } from "./nostr";

interface AppState {
  // Auth
  user: NDKUser | null;
  isConnected: boolean;
  setUser: (user: NDKUser | null) => void;
  setConnected: (connected: boolean) => void;

  // Feeds
  latestNotes: LongFormNote[];
  followingNotes: LongFormNote[];
  setLatestNotes: (notes: LongFormNote[]) => void;
  setFollowingNotes: (notes: LongFormNote[]) => void;

  // Active article
  activeArticle: LongFormNote | null;
  setActiveArticle: (article: LongFormNote | null) => void;

  // Speed reading
  isSpeedReading: boolean;
  speedWPM: number;
  setSpeedReading: (active: boolean) => void;
  setSpeedWPM: (wpm: number) => void;

  // Active feed tab
  activeTab: "latest" | "following";
  setActiveTab: (tab: "latest" | "following") => void;

  // Loading states
  isLoadingLatest: boolean;
  isLoadingFollowing: boolean;
  setLoadingLatest: (loading: boolean) => void;
  setLoadingFollowing: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isConnected: false,
  setUser: (user) => set({ user }),
  setConnected: (connected) => set({ isConnected: connected }),

  latestNotes: [],
  followingNotes: [],
  setLatestNotes: (notes) => set({ latestNotes: notes }),
  setFollowingNotes: (notes) => set({ followingNotes: notes }),

  activeArticle: null,
  setActiveArticle: (article) => set({ activeArticle: article }),

  isSpeedReading: false,
  speedWPM: 300,
  setSpeedReading: (active) => set({ isSpeedReading: active }),
  setSpeedWPM: (wpm) => set({ speedWPM: wpm }),

  activeTab: "latest",
  setActiveTab: (tab) => set({ activeTab: tab }),

  isLoadingLatest: false,
  isLoadingFollowing: false,
  setLoadingLatest: (loading) => set({ isLoadingLatest: loading }),
  setLoadingFollowing: (loading) => set({ isLoadingFollowing: loading }),
}));
