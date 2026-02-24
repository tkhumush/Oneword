"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/lib/store";
import { publishReaction, publishComment } from "@/lib/nostr";

interface ContentBlock {
  type: "text" | "image";
  content: string; // words for text, url for image
}

/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * This is the character where the eye naturally focuses.
 * Based on the Spritz algorithm used in rsvp-reading and OpenSpritz.
 */
function getORPIndex(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

/**
 * Calculate display duration multiplier for a word based on punctuation.
 * Words ending in sentence-ending punctuation get extra time.
 */
function getWordDelay(word: string): number {
  const lastChar = word[word.length - 1];
  if (".!?".includes(lastChar)) return 2.5; // sentence end — long pause
  if (",;:".includes(lastChar)) return 1.6; // clause break — medium pause
  if ("-–—".includes(lastChar)) return 1.3; // dash — slight pause
  if (word.length > 10) return 1.2; // long words — slight extra time
  return 1.0;
}

function parseContentBlocks(markdown: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  // Split on image markdown syntax
  const parts = markdown.split(/(!\[.*?\]\(.*?\))/g);

  for (const part of parts) {
    const imgMatch = part.match(/!\[.*?\]\((.*?)\)/);
    if (imgMatch) {
      blocks.push({ type: "image", content: imgMatch[1] });
    } else {
      // Strip markdown syntax for speed reading
      const cleanText = part
        .replace(/#{1,6}\s/g, "") // headers
        .replace(/\*\*(.*?)\*\*/g, "$1") // bold
        .replace(/\*(.*?)\*/g, "$1") // italic
        .replace(/`{1,3}[^`]*`{1,3}/g, "") // code blocks
        .replace(/`([^`]*)`/g, "$1") // inline code
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
        .replace(/^>\s?/gm, "") // blockquotes
        .replace(/^[-*+]\s/gm, "") // list markers
        .replace(/^\d+\.\s/gm, "") // numbered lists
        .replace(/---/g, "") // horizontal rules
        .replace(/\n{2,}/g, "\n")
        .trim();

      if (cleanText) {
        blocks.push({ type: "text", content: cleanText });
      }
    }
  }

  return blocks;
}

function getAllWords(
  blocks: ContentBlock[]
): (string | { type: "image"; url: string })[] {
  const items: (string | { type: "image"; url: string })[] = [];
  for (const block of blocks) {
    if (block.type === "image") {
      items.push({ type: "image", url: block.content });
    } else {
      const words = block.content.split(/\s+/).filter(Boolean);
      items.push(...words);
    }
  }
  return items;
}

/** Renders a word with the ORP (pivot) letter highlighted */
function ORPWord({ word }: { word: string }) {
  if (!word) return null;
  const orpIdx = getORPIndex(word);
  const before = word.slice(0, orpIdx);
  const pivot = word[orpIdx];
  const after = word.slice(orpIdx + 1);

  return (
    <div className="speed-word select-none flex items-baseline justify-center">
      <span className="orp-before">{before}</span>
      <span className="orp-pivot">{pivot}</span>
      <span className="orp-after">{after}</span>
    </div>
  );
}

export default function SpeedReader() {
  const {
    activeArticle,
    setActiveArticle,
    setSpeedReading,
    speedWPM,
    setSpeedWPM,
  } = useStore();

  const [items, setItems] = useState<
    (string | { type: "image"; url: string })[]
  >([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showImage, setShowImage] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (activeArticle) {
      const blocks = parseContentBlocks(activeArticle.content);
      const allItems = getAllWords(blocks);
      setItems(allItems);
    }
  }, [activeArticle]);

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(
    (idx: number) => {
      if (idx >= items.length) {
        setIsPlaying(false);
        setIsFinished(true);
        return;
      }

      const item = items[idx];

      // If it's an image, pause
      if (typeof item === "object" && item.type === "image") {
        setCurrentIndex(idx);
        setIsPlaying(false);
        setIsPaused(true);
        setShowImage(item.url);
        return;
      }

      setCurrentIndex(idx);

      // Calculate delay for this specific word (smart punctuation pausing)
      const baseMs = 60000 / speedWPM;
      const word = item as string;
      const delay = baseMs * getWordDelay(word);

      timerRef.current = setTimeout(() => {
        if (isPlayingRef.current) {
          scheduleNext(idx + 1);
        }
      }, delay);
    },
    [items, speedWPM]
  );

  const startReading = useCallback(() => {
    if (items.length === 0) return;
    setShowImage(null);
    setIsPaused(false);
    setIsPlaying(true);
    setIsFinished(false);
    clearTimer();

    // Start from current position or beginning
    const startIdx = currentIndexRef.current > 0 ? currentIndexRef.current : 0;
    scheduleNext(startIdx);
  }, [items, clearTimer, scheduleNext]);

  const skipImage = useCallback(() => {
    setShowImage(null);
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= items.length) {
      setIsFinished(true);
      return;
    }
    setIsPlaying(true);
    setIsPaused(false);
    clearTimer();
    scheduleNext(nextIdx);
  }, [items.length, clearTimer, scheduleNext]);

  const pauseReading = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setIsPaused(true);
  }, [clearTimer]);

  const resumeReading = useCallback(() => {
    if (showImage) return;
    setIsPaused(false);
    setIsPlaying(true);
    clearTimer();
    scheduleNext(currentIndexRef.current + 1);
  }, [showImage, clearTimer, scheduleNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // When WPM changes mid-playback, restart scheduling from current word
  useEffect(() => {
    if (isPlaying && !showImage) {
      clearTimer();
      scheduleNext(currentIndexRef.current + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedWPM]);

  if (!activeArticle) return null;

  const currentItem = items[currentIndex];
  const currentWord =
    typeof currentItem === "string" ? currentItem : "";
  const progress =
    items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;

  function handleBack() {
    clearTimer();
    setSpeedReading(false);
  }

  function handleBackToFeed() {
    clearTimer();
    setSpeedReading(false);
    setActiveArticle(null);
  }

  if (isFinished) {
    return <FinishedView onBack={handleBackToFeed} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-white/60 hover:text-white text-sm"
          >
            &larr; Article
          </button>
          <span className="text-xs text-white/30">
            {currentIndex + 1} / {items.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-0.5 bg-white/10">
        <div
          className="h-full bg-white/60 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main display area */}
      <div className="flex-1 flex items-center justify-center px-6">
        {showImage ? (
          <div className="flex flex-col items-center gap-8">
            <img
              src={showImage}
              alt=""
              className="max-w-full max-h-[60vh] rounded-lg"
            />
            <button onClick={skipImage} className="btn-skip">
              Skip &rarr;
            </button>
          </div>
        ) : !isPlaying && !isPaused ? (
          <div className="flex flex-col items-center gap-8">
            <h2 className="text-xl text-white/60 text-center leading-relaxed">
              {activeArticle.title}
            </h2>
            <button onClick={startReading} className="btn-play">
              Play
            </button>
          </div>
        ) : (
          <div className="orp-container">
            {/* Fixed focal line */}
            <div className="orp-focal-line" />
            <ORPWord word={currentWord} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black border-t border-white/10 px-4 py-5">
        <div className="max-w-2xl mx-auto">
          {/* Playback controls */}
          <div className="grid grid-cols-3 gap-3 mb-5 max-w-xs mx-auto">
            <button
              onClick={() => {
                clearTimer();
                const newIdx = Math.max(0, currentIndex - 10);
                setCurrentIndex(newIdx);
                if (isPlaying) {
                  scheduleNext(newIdx + 1);
                }
              }}
              className="btn-control"
              title="Back 10 words"
            >
              Back
            </button>

            {isPlaying ? (
              <button onClick={pauseReading} className="btn-play-control">
                Pause
              </button>
            ) : (
              <button
                onClick={isPaused ? resumeReading : startReading}
                className="btn-play-control"
              >
                Play
              </button>
            )}

            <button
              onClick={() => {
                clearTimer();
                const newIdx = Math.min(items.length - 1, currentIndex + 10);
                setCurrentIndex(newIdx);
                if (isPlaying) {
                  scheduleNext(newIdx + 1);
                }
              }}
              className="btn-control"
              title="Forward 10 words"
            >
              Skip
            </button>
          </div>

          {/* WPM control */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-xs text-white/30 w-16 text-right">
              {speedWPM} WPM
            </span>
            <input
              type="range"
              min="100"
              max="1000"
              step="25"
              value={speedWPM}
              onChange={(e) => setSpeedWPM(parseInt(e.target.value))}
              className="wpm-slider flex-1 max-w-xs"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSpeedWPM(Math.max(100, speedWPM - 50))}
                className="text-xs text-white/40 border border-white/10 rounded px-2 py-1 hover:text-white/70"
              >
                -
              </button>
              <button
                onClick={() => setSpeedWPM(Math.min(1000, speedWPM + 50))}
                className="text-xs text-white/40 border border-white/10 rounded px-2 py-1 hover:text-white/70"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinishedView({ onBack }: { onBack: () => void }) {
  const { activeArticle, user } = useStore();
  const [actionFeedback, setActionFeedback] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");

  if (!activeArticle) return null;

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
    setActionFeedback("Zap support coming soon");
    setTimeout(() => setActionFeedback(""), 2000);
  }

  function handleShare() {
    const url = `https://njump.me/${activeArticle!.id}`;
    if (navigator.share) {
      navigator.share({ title: activeArticle!.title, url });
    } else {
      navigator.clipboard.writeText(url);
      setActionFeedback("Link copied!");
      setTimeout(() => setActionFeedback(""), 2000);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <h2 className="text-2xl font-bold mb-2">Finished</h2>
      <p className="text-white/40 mb-10 text-center">
        {activeArticle.title}
      </p>

      {actionFeedback && (
        <p className="text-sm text-white/50 mb-4">{actionFeedback}</p>
      )}

      {showComment && (
        <div className="flex gap-2 mb-6 w-full max-w-sm">
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

      <div className="action-bar mb-10">
        <button onClick={handleLike} className="btn-action-lg">
          Like
        </button>
        <button
          onClick={() => setShowComment(!showComment)}
          className="btn-action-lg"
        >
          Comment
        </button>
        <button onClick={handleZap} className="btn-action-lg">
          Zap
        </button>
        <button onClick={handleShare} className="btn-action-lg">
          Share
        </button>
      </div>

      <button onClick={onBack} className="btn-secondary">
        Back to feed
      </button>
    </div>
  );
}
