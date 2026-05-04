import { ExternalLink } from "lucide-react";

export type MediaEmbedInfo = {
  platform: string;
  embedUrl: string | null;
  aspect: "video" | "post" | "audio";
};

function getYoutubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
  if (!url.hostname.includes("youtube.com")) return null;
  if (url.pathname === "/watch") return url.searchParams.get("v");
  const [, kind, id] = url.pathname.split("/");
  if (kind === "shorts" || kind === "embed") return id || null;
  return null;
}

function getPathId(url: URL, marker: string): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.indexOf(marker);
  return index >= 0 ? parts[index + 1] ?? null : null;
}

export function getMediaEmbedInfo(rawUrl: string): MediaEmbedInfo {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    const youtubeId = getYoutubeId(url);

    if (youtubeId) {
      return {
        platform: "YouTube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`,
        aspect: "video",
      };
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      return {
        platform: "Vimeo",
        embedUrl: id ? `https://player.vimeo.com/video/${id}?dnt=1` : null,
        aspect: "video",
      };
    }

    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      const id = getPathId(url, "video");
      return {
        platform: "TikTok",
        embedUrl: id ? `https://www.tiktok.com/embed/v2/${id}` : null,
        aspect: "post",
      };
    }

    if (host === "instagram.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const type = parts.find((part) => ["p", "reel", "tv"].includes(part));
      const code = type ? parts[parts.indexOf(type) + 1] : null;
      return {
        platform: "Instagram",
        embedUrl: type && code ? `https://www.instagram.com/${type}/${code}/embed` : null,
        aspect: "post",
      };
    }

    if (host === "twitter.com" || host === "x.com") {
      const id = getPathId(url, "status");
      return {
        platform: host === "x.com" ? "X" : "Twitter",
        embedUrl: id ? `https://platform.twitter.com/embed/Tweet.html?id=${id}` : null,
        aspect: "post",
      };
    }

    if (host === "facebook.com" || host === "m.facebook.com") {
      const isVideo = url.pathname.includes("/videos/");
      const plugin = isVideo ? "video" : "post";
      return {
        platform: "Facebook",
        embedUrl: `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(rawUrl)}&show_text=true&width=500`,
        aspect: isVideo ? "video" : "post",
      };
    }

    if (host === "soundcloud.com") {
      return {
        platform: "SoundCloud",
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(rawUrl)}&visual=true`,
        aspect: "audio",
      };
    }

    if (host === "open.spotify.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const [type, id] = parts;
      return {
        platform: "Spotify",
        embedUrl: type && id ? `https://open.spotify.com/embed/${type}/${id}` : null,
        aspect: "audio",
      };
    }

    return { platform: host, embedUrl: null, aspect: "post" };
  } catch {
    return { platform: "Link", embedUrl: null, aspect: "post" };
  }
}

export function MediaEmbed({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const info = getMediaEmbedInfo(url);
  const heightClass =
    info.aspect === "audio"
      ? "h-[190px]"
      : info.aspect === "post"
        ? "h-[520px]"
        : "aspect-video";

  if (!info.embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[180px] flex-col justify-between border border-border bg-muted p-4 transition-colors hover:bg-accent"
      >
        <span className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
          {info.platform}
        </span>
        <span className="break-words text-lg font-black leading-tight">{title}</span>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          Open <ExternalLink className="size-4" />
        </span>
      </a>
    );
  }

  return (
    <div className={`overflow-hidden border border-border bg-muted ${heightClass}`}>
      <iframe
        src={info.embedUrl}
        title={title}
        className="size-full border-0"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
