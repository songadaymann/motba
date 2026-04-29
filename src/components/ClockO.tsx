/**
 * SVG clock icon that replaces the "O" in MOTBA.
 * Uses currentColor so it inherits from parent text color.
 */
export function ClockO({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ verticalAlign: "middle" }}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      <line x1="16" y1="16" x2="16" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="16" x2="22" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 16 + 11 * Math.cos(rad - Math.PI / 2);
        const y1 = 16 + 11 * Math.sin(rad - Math.PI / 2);
        const x2 = 16 + 13 * Math.cos(rad - Math.PI / 2);
        const y2 = 16 + 13 * Math.sin(rad - Math.PI / 2);
        return (
          <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2" />
        );
      })}
    </svg>
  );
}
