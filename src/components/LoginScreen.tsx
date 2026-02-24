"use client";

import { useState } from "react";
import {
  connectNDK,
  loginWithExtension,
  loginWithNsec,
  loginWithNpub,
} from "@/lib/nostr";
import { useStore } from "@/lib/store";

export default function LoginScreen() {
  const { setUser, setConnected } = useStore();
  const [loginMethod, setLoginMethod] = useState<
    "choose" | "extension" | "nsec" | "npub" | "bunker"
  >("choose");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(method: string) {
    setError("");
    setLoading(true);
    try {
      connectNDK();

      let user;
      switch (method) {
        case "extension":
          user = await loginWithExtension();
          break;
        case "nsec":
          user = await loginWithNsec(input);
          break;
        case "npub":
          user = await loginWithNpub(input);
          break;
        case "bunker":
          // Bunker login uses the same flow as extension for now
          user = await loginWithExtension();
          break;
        default:
          throw new Error("Unknown login method");
      }

      await user.fetchProfile();
      setUser(user);
      setConnected(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setLoginMethod("choose");
    } finally {
      setLoading(false);
    }
  }

  function handleReadOnly() {
    setError("");
    connectNDK();
    setConnected(true);
  }

  if (loginMethod === "choose") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">tl;sr</h1>
        <p className="text-white/50 mb-12 text-lg">
          Speed read nostr long-form content
        </p>

        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={() => {
              setLoginMethod("extension");
              handleLogin("extension");
            }}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Connecting..." : "Login with Extension (NIP-07)"}
          </button>

          <button
            onClick={() => setLoginMethod("nsec")}
            disabled={loading}
            className="btn-primary"
          >
            Login with nsec
          </button>

          <button
            onClick={() => setLoginMethod("npub")}
            disabled={loading}
            className="btn-primary"
          >
            Login with npub (read-only)
          </button>

          <button
            onClick={() => setLoginMethod("bunker")}
            disabled={loading}
            className="btn-primary"
          >
            Login with Bunker (NIP-46)
          </button>

          <div className="border-t border-white/10 my-2" />

          <button
            onClick={handleReadOnly}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? "Connecting..." : "Browse without login"}
          </button>
        </div>

        {error && (
          <p className="text-red-400 mt-6 text-sm text-center">{error}</p>
        )}
      </div>
    );
  }

  if (loginMethod === "nsec" || loginMethod === "npub") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">tl;sr</h1>
        <p className="text-white/50 mb-12 text-lg">
          Enter your {loginMethod}
        </p>

        <div className="w-full max-w-sm flex flex-col gap-4">
          <input
            type={loginMethod === "nsec" ? "password" : "text"}
            placeholder={
              loginMethod === "nsec" ? "nsec1..." : "npub1..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/50"
          />

          <button
            onClick={() => handleLogin(loginMethod)}
            disabled={loading || !input}
            className="btn-primary"
          >
            {loading ? "Connecting..." : "Login"}
          </button>

          <button
            onClick={() => {
              setLoginMethod("choose");
              setInput("");
              setError("");
            }}
            className="btn-secondary"
          >
            Back
          </button>
        </div>

        {error && (
          <p className="text-red-400 mt-6 text-sm text-center">{error}</p>
        )}
      </div>
    );
  }

  // Extension / bunker loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">tl;sr</h1>
      <p className="text-white/50 mb-8">Connecting...</p>
      {error && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button
            onClick={() => {
              setLoginMethod("choose");
              setError("");
            }}
            className="btn-secondary"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
