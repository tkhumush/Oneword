"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { searchNotes, LongFormNote } from "@/lib/nostr";
import NoteCard from "./NoteCard";

export default function SearchView() {
  const { setSearching } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LongFormNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSearched(false);
    try {
      const notes = await searchNotes(q);
      setResults(notes);
      setSearched(true);
    } catch (e) {
      console.error("Search failed:", e);
      setError("Search failed. Check the format and try again.");
    } finally {
      setLoading(false);
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
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Search</h1>
          <button
            onClick={() => setSearching(false)}
            className="text-white/40 text-sm hover:text-white/70"
          >
            Back
          </button>
        </div>
      </header>

      {/* Search input */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="npub, nip-05, nevent, note id, or hex key"
            autoFocus
            className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/50 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-medium hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "..." : "Go"}
          </button>
        </div>
        <p className="text-xs text-white/20 mt-2 px-1">
          Paste a user&apos;s nip-05 (e.g. user@domain.com), npub, nevent, or hex pubkey
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-2">
        {error && (
          <p className="text-red-400 text-sm text-center py-8">{error}</p>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-white/40 animate-pulse">Searching...</div>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-white/40 text-center py-12">
            No long-form articles found.
          </p>
        )}

        <div className="flex flex-col gap-1">
          {results.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </div>
    </div>
  );
}
