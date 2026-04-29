/**
 * Full-bleed halftone dot texture overlay.
 * Renders a subtle dot pattern across the parent container.
 * Uses pointer-events: none so it doesn't block interactions.
 */
export function HalftoneOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{
        backgroundImage: "radial-gradient(circle, var(--riso-ink, #1a1a1a) 1px, transparent 1px)",
        backgroundSize: "4px 4px",
        opacity: 0.03,
      }}
      aria-hidden="true"
    />
  );
}
