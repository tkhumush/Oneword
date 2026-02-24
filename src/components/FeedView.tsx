"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import {
  fetchLatestLongForm,
  fetchFollowingLongForm,
} from "@/lib/nostr";
import NoteCard from "./NoteCard";

export default function FeedView() {
  const {
    user,
    activeTab,
    setActiveTab,
    latestNotes,
    followingNotes,
    setLatestNotes,
    setFollowingNotes,
    isLoadingLatest,
    isLoadingFollowing,
    setLoadingLatest,
    setLoadingFollowing,
    setUser,
    setConnected,
  } = useStore();

  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "following" && user && followingNotes.length === 0) {
      loadFollowing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  async function loadLatest() {
    setLoadingLatest(true);
    try {
      const notes = await fetchLatestLongForm(10);
      setLatestNotes(notes);
    } catch (e) {
      console.error("Failed to fetch latest:", e);
    } finally {
      setLoadingLatest(false);
    }
  }

  async function loadFollowing() {
    if (!user) return;
    setLoadingFollowing(true);
    try {
      const notes = await fetchFollowingLongForm(user, 10);
      setFollowingNotes(notes);
    } catch (e) {
      console.error("Failed to fetch following:", e);
    } finally {
      setLoadingFollowing(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setConnected(false);
  }

  const notes = activeTab === "latest" ? latestNotes : followingNotes;
  const loading = activeTab === "latest" ? isLoadingLatest : isLoadingFollowing;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Oneword</h1>
          <button onClick={handleLogout} className="text-white/40 text-sm hover:text-white/70">
            {user ? "Logout" : "Back"}
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-white/10">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActiveTab("latest")}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === "latest"
                ? "text-white border-b-2 border-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === "following"
                ? "text-white border-b-2 border-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {activeTab === "following" && !user && (
          <p className="text-white/40 text-center py-12">
            Login to see posts from people you follow.
          </p>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-white/40 animate-pulse">Loading articles...</div>
          </div>
        )}

        {!loading && notes.length === 0 && (activeTab === "latest" || user) && (
          <p className="text-white/40 text-center py-12">
            No articles found.
          </p>
        )}

        <div className="flex flex-col gap-1">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </div>
    </div>
  );
}
