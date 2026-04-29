export const FAR_FUTURE_DURATION_BY_SLUG: Record<
  string,
  { yearsDisplay: string; daysDisplay: string }
> = {
  "0xdesigner-310-px0-2-18-5-18-p-k-k-k": {
    yearsDisplay: "3.343 × 10^48 years",
    daysDisplay: "1.221 × 10^51",
  },
};

export function getFarFutureDuration(slug: string) {
  return FAR_FUTURE_DURATION_BY_SLUG[slug] ?? null;
}

export function isFarFutureWork(slug: string, yearsDisplay?: string | null) {
  return Boolean(
    getFarFutureDuration(slug) ||
      yearsDisplay?.includes("10^48") ||
      yearsDisplay?.includes("10^{48}")
  );
}
