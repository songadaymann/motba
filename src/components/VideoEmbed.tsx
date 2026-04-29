"use client";

import { useEffect, useRef, useState } from "react";

interface VideoEmbedProps {
  url: string;
  embedId: string | null;
  platform: string | null;
  title: string;
}

function getEmbedUrl(platform: string, embedId: string): string | null {
  switch (platform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${embedId}?rel=0`;
    case "vimeo":
      return `https://player.vimeo.com/video/${embedId}?dnt=1`;
    default:
      return null;
  }
}

function getThumbnailUrl(platform: string, embedId: string): string | null {
  switch (platform) {
    case "youtube":
      return `https://img.youtube.com/vi/${embedId}/hqdefault.jpg`;
    case "vimeo":
      // Vimeo thumbnails require an API call; fall back to a play button overlay
      return null;
    default:
      return null;
  }
}

/**
 * Lazy video embed: shows a thumbnail with a play button.
 * Only loads the iframe when clicked (saves bandwidth).
 */
export function VideoEmbed({ url, embedId, platform, title }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const embedUrl =
    platform && embedId ? getEmbedUrl(platform, embedId) : null;
  const thumbnail =
    platform && embedId ? getThumbnailUrl(platform, embedId) : null;

  // If we can't embed it, just show a link
  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border border-border overflow-hidden hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-3 p-4">
          <PlayIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{url}</p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div ref={ref} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
      {playing && inView ? (
        <iframe
          src={embedUrl + "&autoplay=1"}
          title={title}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="absolute inset-0 w-full h-full flex items-center justify-center group"
          aria-label={`Play ${title}`}
        >
          {thumbnail && inView ? (
            <img
              src={thumbnail}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
          {/* Play button */}
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg group-hover:scale-110 transition-transform">
            <PlayIcon className="h-7 w-7 text-black ml-1" />
          </div>
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-sm font-medium truncate">{title}</p>
          </div>
        </button>
      )}
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
