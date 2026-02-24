"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useStore } from "@/lib/store";
import { fetchUserProfile, publishReaction, publishComment } from "@/lib/nostr";
import SpeedReader from "./SpeedReader";

export default function ArticleView() {
  const {
    activeArticle,
    setActiveArticle,
    isSpeedReading,
    setSpeedReading,
    user,
  } = useStore();
  const [profile, setProfile] = useState<{
    name: string;
    picture: string;
  } | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");

  useEffect(() => {
    if (activeArticle) {
      fetchUserProfile(activeArticle.pubkey)
        .then((p) => setProfile({ name: p.name, picture: p.picture }))
        .catch(() => {
          setProfile({
            name: activeArticle.pubkey.slice(0, 12) + "...",
            picture: "",
          });
        });
    }
  }, [activeArticle]);

  if (!activeArticle) return null;

  if (isSpeedReading) {
    return <SpeedReader />;
  }

  function handleBack() {
    setActiveArticle(null);
    setSpeedReading(false);
  }

  async function handleLike() {
    if (!user) {
      setActionFeedback("Login to react");
      setTimeout(() => setActionFeedback(""), 2000);
      return;
    }
    try {
      await publishReaction(activeArticle!.event);
      setActionFeedback("Liked!");
      setTimeout(() => setActionFeedback(""), 2000);
    } catch {
      setActionFeedback("Failed to react");
      setTimeout(() => setActionFeedback(""), 2000);
    }
  }

  async function handleComment() {
    if (!user) {
      setActionFeedback("Login to comment");
      setTimeout(() => setActionFeedback(""), 2000);
      return;
    }
    if (!commentText.trim()) return;
    try {
      await publishComment(activeArticle!.event, commentText);
      setCommentText("");
      setShowComment(false);
      setActionFeedback("Comment posted!");
      setTimeout(() => setActionFeedback(""), 2000);
    } catch {
      setActionFeedback("Failed to comment");
      setTimeout(() => setActionFeedback(""), 2000);
    }
  }

  function handleZap() {
    // Open a zap modal or redirect — for now show feedback
    setActionFeedback("Zap support coming soon");
    setTimeout(() => setActionFeedback(""), 2000);
  }

  function handleShare() {
    const noteId = activeArticle!.id;
    const url = `https://njump.me/${noteId}`;
    if (navigator.share) {
      navigator.share({ title: activeArticle!.title, url });
    } else {
      navigator.clipboard.writeText(url);
      setActionFeedback("Link copied!");
      setTimeout(() => setActionFeedback(""), 2000);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-white/60 hover:text-white text-sm"
          >
            &larr; Back
          </button>
          <button
            onClick={() => setSpeedReading(true)}
            className="btn-speed"
          >
            &#9654; Speed Read
          </button>
        </div>
      </header>

      {/* Article */}
      <article className="flex-1 max-w-2xl mx-auto w-full px-5 py-8">
        {/* Author */}
        <div className="flex items-center gap-3 mb-6">
          {profile?.picture ? (
            <img
              src={profile.picture}
              alt=""
              className="w-10 h-10 rounded-full object-cover bg-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10" />
          )}
          <span className="text-sm font-medium text-white/70">
            {profile?.name || "..."}
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-6 leading-tight">
          {activeArticle.title}
        </h1>

        {/* Markdown Content */}
        <div className="article-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt || ""}
                  className="w-full rounded-lg my-6"
                  loading="lazy"
                />
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 underline hover:text-white"
                >
                  {children}
                </a>
              ),
            }}
          >
            {activeArticle.content}
          </ReactMarkdown>
        </div>

        {/* Hashtags */}
        {activeArticle.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 mb-8">
            {activeArticle.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-white/30 border border-white/10 rounded-full px-3 py-1"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Engagement buttons */}
      <div className="sticky bottom-0 bg-black border-t border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {actionFeedback && (
            <p className="text-center text-sm text-white/50 mb-3">
              {actionFeedback}
            </p>
          )}

          {showComment && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
              />
              <button onClick={handleComment} className="btn-action">
                Post
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={handleLike} className="btn-action-lg">
              <span className="text-2xl">&#9825;</span>
              <span className="text-xs">Like</span>
            </button>
            <button
              onClick={() => setShowComment(!showComment)}
              className="btn-action-lg"
            >
              <span className="text-2xl">&#9998;</span>
              <span className="text-xs">Comment</span>
            </button>
            <button onClick={handleZap} className="btn-action-lg">
              <span className="text-2xl">&#9889;</span>
              <span className="text-xs">Zap</span>
            </button>
            <button onClick={handleShare} className="btn-action-lg">
              <span className="text-2xl">&#8599;</span>
              <span className="text-xs">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
