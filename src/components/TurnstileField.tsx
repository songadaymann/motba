"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let isScriptReady = false;
const scriptReadyListeners = new Set<() => void>();

function markScriptReady() {
  isScriptReady = true;
  for (const listener of scriptReadyListeners) listener();
}

export function TurnstileField({
  siteKey,
  action,
  resetSignal,
  onTokenChange,
}: {
  siteKey: string;
  action: string;
  resetSignal: number;
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const resetSignalRef = useRef(resetSignal);
  const [ready, setReady] = useState(() => isScriptReady);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (isScriptReady) return;

    const listener = () => setReady(true);
    scriptReadyListeners.add(listener);
    return () => {
      scriptReadyListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current || widgetIdRef.current) return;
    if (!window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      callback: (token) => onTokenChangeRef.current(token),
      "expired-callback": () => onTokenChangeRef.current(""),
      "error-callback": () => onTokenChangeRef.current(""),
    });

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, ready, siteKey]);

  useEffect(() => {
    if (resetSignalRef.current === resetSignal) return;
    resetSignalRef.current = resetSignal;
    onTokenChangeRef.current("");
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }, [resetSignal]);

  if (!siteKey) return null;

  return (
    <div className="grid gap-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={markScriptReady}
      />
      <div ref={containerRef} />
    </div>
  );
}
