import NDK, {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKNip07Signer,
  NDKPrivateKeySigner,
  NDKUser,
} from "@nostr-dev-kit/ndk";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
  "wss://nostr.wine",
];

let ndkInstance: NDK | null = null;

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
  // Don't await - NDK manages relay connections in the background.
  // Subsequent operations (fetchEvents, publish) wait for available relays.
  ndk.connect();
  return ndk;
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

export async function fetchArticleById(id: string): Promise<LongFormNote | null> {
  const ndk = getNDK();

  // Try fetching by event ID
  const filter: NDKFilter = {
    ids: [id],
  };

  const events = await ndk.fetchEvents(filter);
  const event = Array.from(events)[0];
  if (!event) return null;

  const note = parseLongFormEvent(event);
  return note.content.length > 0 ? note : null;
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
