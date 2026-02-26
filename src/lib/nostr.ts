import NDK, {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKNip07Signer,
  NDKPrivateKeySigner,
  NDKUser,
} from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
  "wss://nostr.wine",
];

let ndkInstance: NDK | null = null;
let relayReady: Promise<void> | null = null;

export function getNDK(): NDK {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: RELAYS,
    });
  }
  return ndkInstance;
}

export function connectNDK(): NDK {
  const ndk = getNDK();
  if (!relayReady) {
    // Resolve as soon as the first relay is ready to serve requests,
    // or after a 5 s safety timeout so the UI is never stuck forever.
    relayReady = new Promise<void>((resolve) => {
      const done = () => { resolve(); ndk.pool.off("relay:ready", done); };
      ndk.pool.on("relay:ready", done);
      setTimeout(resolve, 5000);
    });
    // Fire-and-forget: awaiting connect() blocks until ALL relays finish
    // (or their own timeout), which previously caused the login hang.
    ndk.connect();
  }
  return ndk;
}

/** Wait until at least one relay is connected and ready. */
export async function ensureRelayReady(): Promise<void> {
  if (relayReady) await relayReady;
}

export async function loginWithExtension(): Promise<NDKUser> {
  if (typeof window === "undefined" || !window.nostr) {
    throw new Error("No NIP-07 extension found. Install Alby or nos2x.");
  }
  const ndk = getNDK();
  const signer = new NDKNip07Signer();
  ndk.signer = signer;
  const user = await signer.user();
  user.ndk = ndk;
  return user;
}

export async function loginWithNsec(nsec: string): Promise<NDKUser> {
  const ndk = getNDK();
  const signer = new NDKPrivateKeySigner(nsec);
  ndk.signer = signer;
  const user = await signer.user();
  user.ndk = ndk;
  return user;
}

export async function loginWithNpub(npub: string): Promise<NDKUser> {
  const ndk = getNDK();
  const user = ndk.getUser({ npub });
  user.ndk = ndk;
  return user;
}

export interface LongFormNote {
  id: string;
  pubkey: string;
  title: string;
  summary: string;
  content: string;
  image?: string;
  hashtags: string[];
  publishedAt: number;
  identifier: string;
  event: NDKEvent;
}

function parseLongFormEvent(event: NDKEvent): LongFormNote {
  const tags = event.tags;
  const title =
    tags.find((t) => t[0] === "title")?.[1] || "Untitled";
  const summary =
    tags.find((t) => t[0] === "summary")?.[1] || "";
  const image =
    tags.find((t) => t[0] === "image")?.[1] || undefined;
  const identifier =
    tags.find((t) => t[0] === "d")?.[1] || "";
  const publishedAt = parseInt(
    tags.find((t) => t[0] === "published_at")?.[1] || String(event.created_at || 0)
  );
  const hashtags = tags.filter((t) => t[0] === "t").map((t) => t[1]);

  return {
    id: event.id,
    pubkey: event.pubkey,
    title,
    summary,
    content: event.content,
    image,
    hashtags,
    publishedAt,
    identifier,
    event,
  };
}

export async function fetchFollowingLongForm(
  user: NDKUser,
  limit = 10
): Promise<LongFormNote[]> {
  const ndk = getNDK();
  await ensureRelayReady();

  // Fetch the user's contact list (kind 3)
  const contactListEvents = await ndk.fetchEvents({
    kinds: [3 as NDKKind],
    authors: [user.pubkey],
    limit: 1,
  });

  const contactEvent = Array.from(contactListEvents)[0];
  if (!contactEvent) return [];

  const followPubkeys = contactEvent.tags
    .filter((t) => t[0] === "p")
    .map((t) => t[1]);

  if (followPubkeys.length === 0) return [];

  // Fetch long form posts from followed users
  const filter: NDKFilter = {
    kinds: [30023 as NDKKind],
    authors: followPubkeys,
    limit: limit * 2,
  };

  const events = await ndk.fetchEvents(filter);
  const notes = Array.from(events)
    .map(parseLongFormEvent)
    .filter((n) => n.content.length > 0)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, limit);

  return notes;
}

export async function fetchUserProfile(
  pubkey: string
): Promise<{ name: string; picture: string; about: string }> {
  const ndk = getNDK();
  const user = ndk.getUser({ pubkey });
  await user.fetchProfile();
  return {
    name:
      user.profile?.displayName ||
      user.profile?.name ||
      pubkey.slice(0, 12) + "...",
    picture: user.profile?.image || user.profile?.banner || "",
    about: user.profile?.about || "",
  };
}

export async function publishReaction(
  eventToReact: NDKEvent,
  content: string = "+"
): Promise<void> {
  const ndk = getNDK();
  const reaction = new NDKEvent(ndk);
  reaction.kind = 7 as NDKKind;
  reaction.content = content;
  reaction.tags = [
    ["e", eventToReact.id],
    ["p", eventToReact.pubkey],
  ];
  await reaction.publish();
}

export async function publishComment(
  eventToComment: NDKEvent,
  content: string
): Promise<void> {
  const ndk = getNDK();
  const comment = new NDKEvent(ndk);
  comment.kind = 1 as NDKKind;
  comment.content = content;
  comment.tags = [
    ["e", eventToComment.id, "", "root"],
    ["p", eventToComment.pubkey],
  ];
  await comment.publish();
}

/** Resolve a search query to long-form notes.
 *  Accepts: npub, hex pubkey, nip-05, nevent, note id, naddr, or hex event id. */
export async function searchNotes(
  query: string,
  limit = 20
): Promise<LongFormNote[]> {
  const ndk = getNDK();
  await ensureRelayReady();

  const q = query.trim();
  if (!q) return [];

  // Try nip-05 (contains @ or looks like a domain handle)
  if (q.includes("@") || (q.includes(".") && !q.startsWith("npub") && !q.startsWith("nevent") && !q.startsWith("note") && !q.startsWith("naddr"))) {
    return searchByNip05(ndk, q, limit);
  }

  // Try bech32 decoding (npub, nevent, note, naddr, nprofile)
  if (q.startsWith("npub") || q.startsWith("nevent") || q.startsWith("note") || q.startsWith("naddr") || q.startsWith("nprofile")) {
    try {
      const decoded = nip19.decode(q);
      switch (decoded.type) {
        case "npub":
          return fetchLongFormByAuthor(ndk, decoded.data as string, limit);
        case "nprofile": {
          const data = decoded.data as { pubkey: string };
          return fetchLongFormByAuthor(ndk, data.pubkey, limit);
        }
        case "nevent": {
          const data = decoded.data as { id: string };
          return fetchEventById(ndk, data.id);
        }
        case "note":
          return fetchEventById(ndk, decoded.data as string);
        case "naddr": {
          const data = decoded.data as { pubkey: string; identifier: string; kind: number };
          return fetchByNaddr(ndk, data.pubkey, data.identifier, data.kind);
        }
      }
    } catch {
      return [];
    }
  }

  // Hex string — could be a pubkey (64 chars) or event id (64 chars)
  if (/^[0-9a-f]{64}$/i.test(q)) {
    // Try as event id first, fall back to author
    const byEvent = await fetchEventById(ndk, q);
    if (byEvent.length > 0) return byEvent;
    return fetchLongFormByAuthor(ndk, q, limit);
  }

  return [];
}

async function searchByNip05(ndk: NDK, nip05: string, limit: number): Promise<LongFormNote[]> {
  const user = await ndk.getUserFromNip05(nip05);
  if (!user) return [];
  return fetchLongFormByAuthor(ndk, user.pubkey, limit);
}

async function fetchLongFormByAuthor(ndk: NDK, pubkey: string, limit: number): Promise<LongFormNote[]> {
  const filter: NDKFilter = {
    kinds: [30023 as NDKKind],
    authors: [pubkey],
    limit,
  };
  const events = await ndk.fetchEvents(filter);
  return Array.from(events)
    .map(parseLongFormEvent)
    .filter((n) => n.content.length > 0)
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

async function fetchEventById(ndk: NDK, id: string): Promise<LongFormNote[]> {
  const filter: NDKFilter = {
    ids: [id],
  };
  const events = await ndk.fetchEvents(filter);
  return Array.from(events)
    .map(parseLongFormEvent)
    .filter((n) => n.content.length > 0);
}

async function fetchByNaddr(ndk: NDK, pubkey: string, identifier: string, kind: number): Promise<LongFormNote[]> {
  const filter: NDKFilter = {
    kinds: [kind as NDKKind],
    authors: [pubkey],
    "#d": [identifier],
  };
  const events = await ndk.fetchEvents(filter);
  return Array.from(events)
    .map(parseLongFormEvent)
    .filter((n) => n.content.length > 0);
}
