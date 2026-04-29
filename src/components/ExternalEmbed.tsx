"use client";

import { useState, useCallback } from "react";

interface ExternalEmbedProps {
  url: string;
  title: string;
}

/**
 * Renders an external site as a full-width inline iframe embed.
 * Falls back to a link if the site blocks iframe embedding.
 *
 * No sandbox attribute is used because the URLs are admin-managed
 * (from the database) and many sites (e.g. OpenSeadragon-based galleries)
 * need full browser capabilities to render correctly.
 */
export function ExternalEmbed({ url, title }: ExternalEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted p-12 text-center">
        <p className="text-muted-foreground">
          This site doesn&apos;t allow embedding.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open {title}
          <svg
            className="ml-1.5 h-3.5 w-3.5"
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
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border relative">
      {/* Loading skeleton */}
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse"
          style={{ height: "80vh" }}
        >
          <p className="text-sm text-muted-foreground">Loading embed...</p>
        </div>
      )}
      <iframe
        src={url}
        title={title}
        className="w-full border-0"
        style={{ height: "80vh" }}
        allow="fullscreen"
        onLoad={handleLoad}
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
