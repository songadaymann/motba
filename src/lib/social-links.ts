export const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  threads: "Threads",
  x: "X",
  twitter: "Twitter",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  vimeo: "Vimeo",
  linkedin: "LinkedIn",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  tumblr: "Tumblr",
  substack: "Substack",
  patreon: "Patreon",
  website: "Website",
};

export interface ParsedSocialUrl {
  platform: string;
  handle: string | null;
}

function cleanHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = decodeURIComponent(value)
    .replace(/^@+/, "")
    .replace(/\/+$/, "")
    .trim();
  return cleaned || null;
}

export function parseSocialUrl(url: string): ParsedSocialUrl {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const segments = parsed.pathname.split("/").filter(Boolean);
    const firstSegment = cleanHandle(segments[0]);

    if (host === "instagram.com") {
      return { platform: "instagram", handle: firstSegment };
    }
    if (host === "threads.net") {
      return { platform: "threads", handle: firstSegment };
    }
    if (host === "x.com") {
      return { platform: "x", handle: firstSegment };
    }
    if (host === "twitter.com") {
      return { platform: "twitter", handle: firstSegment };
    }
    if (host === "facebook.com" || host === "fb.com") {
      return { platform: "facebook", handle: firstSegment };
    }
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      const youtubeHandle =
        segments[0]?.startsWith("@") ? cleanHandle(segments[0]) : cleanHandle(segments[1]);
      return { platform: "youtube", handle: youtubeHandle };
    }
    if (host === "tiktok.com") {
      return { platform: "tiktok", handle: firstSegment };
    }
    if (host === "soundcloud.com") {
      return { platform: "soundcloud", handle: firstSegment };
    }
    if (host === "bandcamp.com" || host.endsWith(".bandcamp.com")) {
      return { platform: "bandcamp", handle: host === "bandcamp.com" ? firstSegment : host.split(".")[0] };
    }
    if (host === "vimeo.com") {
      return { platform: "vimeo", handle: firstSegment };
    }
    if (host === "linkedin.com") {
      return { platform: "linkedin", handle: cleanHandle(segments.at(-1)) };
    }
    if (host === "bsky.app") {
      return { platform: "bluesky", handle: cleanHandle(segments.at(-1)) };
    }
    if (host === "tumblr.com" || host.endsWith(".tumblr.com")) {
      return { platform: "tumblr", handle: host === "tumblr.com" ? firstSegment : host.split(".")[0] };
    }
    if (host.includes("substack.com")) {
      return { platform: "substack", handle: host.endsWith(".substack.com") ? host.split(".")[0] : firstSegment };
    }
    if (host === "patreon.com") {
      return { platform: "patreon", handle: firstSegment };
    }
    if (host.includes("mastodon") || parsed.pathname.includes("/@")) {
      return { platform: "mastodon", handle: cleanHandle(segments.find((segment) => segment.startsWith("@"))) };
    }

    return { platform: "website", handle: firstSegment };
  } catch {
    return { platform: "website", handle: null };
  }
}

export function socialDisplayName(platform: string, handle?: string | null, label?: string | null) {
  if (label) return label;
  const platformName = SOCIAL_PLATFORM_LABELS[platform] || platform;
  return handle ? `${platformName} @${handle}` : platformName;
}
