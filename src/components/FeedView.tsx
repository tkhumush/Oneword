"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { fetchFollowingLongForm } from "@/lib/nostr";
import NoteCard from "./NoteCard";

export default function FeedView() {
  const {
    user,
    followingNotes,
    setFollowingNotes,
    isLoadingFollowing,
    setLoadingFollowing,
    setUser,
    setConnected,
    setSearching,
  } = useStore();

  useEffect(() => {
    if (user && followingNotes.length === 0) {
      loadFollowing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">tl;sr</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearching(true)}
              className="text-white/40 text-sm hover:text-white/70"
            >
              Search
            </button>
            <button onClick={handleLogout} className="text-white/40 text-sm hover:text-white/70">
              {user ? "Logout" : "Back"}
            </button>
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {!user && (
          <p className="text-white/40 text-center py-12">
            Login to see posts from people you follow.
          </p>
        )}

        {isLoadingFollowing && (
          <div className="flex justify-center py-12">
            <div className="text-white/40 animate-pulse">Loading articles...</div>
          </div>
        )}

        {!isLoadingFollowing && followingNotes.length === 0 && user && (
          <p className="text-white/40 text-center py-12">
            No articles found.
          </p>
        )}

        <div className="flex flex-col gap-1">
          {followingNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </div>
    </div>
  );
}
