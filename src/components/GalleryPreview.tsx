"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface GalleryPreviewProps {
  url: string;
  title: string;
  children: React.ReactNode;
}

export function GalleryPreview({ url, title, children }: GalleryPreviewProps) {
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLoadError(false); }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer"
      >
        {children}
      </button>

      <DialogContent
        className="flex flex-col sm:max-w-[90vw] max-h-[90vh] w-full h-[85vh] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
          <DialogTitle className="text-sm font-medium truncate">
            {title}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Open in new tab
              <svg
                className="h-3 w-3"
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
            <button
              onClick={() => setOpen(false)}
              className="rounded-sm p-1 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* Iframe */}
        <div className="flex-1 relative bg-muted">
          {loadError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-muted-foreground">
                This site doesn&apos;t allow embedding. You can view it directly instead.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Open {title}
              </a>
            </div>
          ) : (
            <iframe
              src={url}
              title={title}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups"
              onError={() => setLoadError(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
