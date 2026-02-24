"use client";

import { useEffect, useState } from "react";
import { LongFormNote, fetchUserProfile } from "@/lib/nostr";
import { useStore } from "@/lib/store";

interface NoteCardProps {
  note: LongFormNote;
}

export default function NoteCard({ note }: NoteCardProps) {
  const { setActiveArticle } = useStore();
  const [profile, setProfile] = useState<{
    name: string;
    picture: string;
  } | null>(null);

  useEffect(() => {
    fetchUserProfile(note.pubkey).then((p) =>
      setProfile({ name: p.name, picture: p.picture })
    ).catch(() => {
      setProfile({ name: note.pubkey.slice(0, 12) + "...", picture: "" });
    });
  }, [note.pubkey]);

  const summary =
    note.summary ||
    note.content.replace(/[#*`>\[\]!()]/g, "").slice(0, 140) + "...";

  const date = new Date(note.publishedAt * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      onClick={() => setActiveArticle(note)}
      className="w-full text-left py-5 px-2 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
    >
      {/* Author row */}
      <div className="flex items-center gap-3 mb-3">
        {profile?.picture ? (
          <img
            src={profile.picture}
            alt=""
            className="w-8 h-8 rounded-full object-cover bg-white/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10" />
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/80">
            {profile?.name || "..."}
          </span>
          <span className="text-xs text-white/30">{date}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold mb-1 leading-snug">{note.title}</h3>

      {/* Summary */}
      <p className="text-sm text-white/50 leading-relaxed line-clamp-2 mb-3">
        {summary}
      </p>

      {/* Hashtags */}
      {note.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {note.hashtags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-xs text-white/30 border border-white/10 rounded-full px-2 py-0.5"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
