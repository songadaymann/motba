"use client";

import { VideoEmbed } from "./VideoEmbed";

interface LinkData {
  id: string;
  url: string;
  title: string;
  description: string | null;
  link_type: string;
  platform: string | null;
  embed_id: string | null;
  sort_order: number;
}

interface ArtworkLinksProps {
  links: LinkData[];
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  wikipedia: "Wikipedia",
  medium: "Medium",
  substack: "Substack",
  twitter: "Twitter",
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
};

const TYPE_LABELS: Record<string, string> = {
  video: "Video",
  article: "Article",
  website: "Website",
  social: "Social",
};

export function ArtworkLinks({ links }: ArtworkLinksProps) {
  if (links.length === 0) return null;

  const videos = links.filter((l) => l.link_type === "video");
  const others = links.filter((l) => l.link_type !== "video");

  return (
    <div className="space-y-6">
      {/* Video embeds */}
      {videos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Videos</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {videos.map((link) => (
              <VideoEmbed
                key={link.id}
                url={link.url}
                embedId={link.embed_id}
                platform={link.platform}
                title={link.title}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other links */}
      {others.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Related</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
              >
                <LinkTypeIcon type={link.link_type} className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                    {link.title}
                  </p>
                  {link.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {link.description}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    {link.platform
                      ? PLATFORM_LABELS[link.platform] || link.platform
                      : TYPE_LABELS[link.link_type] || "Link"}
                  </p>
                </div>
                <svg
                  className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LinkTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "article":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
      );
    case "social":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
  }
}
