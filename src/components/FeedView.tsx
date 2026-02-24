"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { fetchArticleById } from "@/lib/nostr";

export default function FeedView() {
  const {
    user,
    setUser,
    setConnected,
    setActiveArticle,
    isSearching,
    setSearching,
    searchError,
    setSearchError,
  } = useStore();

  const [searchInput, setSearchInput] = useState("");

  function handleLogout() {
    setUser(null);
    setConnected(false);
  }

  async function handleSearch() {
    const id = searchInput.trim();
    if (!id) return;

    setSearching(true);
    setSearchError(null);
    try {
      const article = await fetchArticleById(id);
      if (article) {
        setActiveArticle(article);
      } else {
        setSearchError("No article found with that ID.");
      }
    } catch (e) {
      console.error("Search failed:", e);
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight shrink-0">Oneword</h1>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter article ID..."
              className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none placeholder:text-white/30 focus:ring-1 focus:ring-white/30"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchInput.trim()}
              className="text-sm text-white/60 hover:text-white disabled:text-white/20 shrink-0"
            >
              {isSearching ? "..." : "Search"}
            </button>
          </div>
          <button onClick={handleLogout} className="text-white/40 text-sm hover:text-white/70 shrink-0">
            {user ? "Logout" : "Back"}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 flex items-center justify-center">
        {searchError ? (
          <p className="text-white/40 text-center">{searchError}</p>
        ) : (
          <p className="text-white/30 text-center text-sm">
            Search for an article by entering its Nostr event ID above.
          </p>
        )}
      </div>
    </div>
  );
}
