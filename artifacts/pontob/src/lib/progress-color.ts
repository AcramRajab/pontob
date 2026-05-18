/**
 * Central progress colour rules (used everywhere in the app):
 *   ≥ 80 %  → blue   (on track / excellent)
 *  51–79 %  → black  (in progress)
 *   ≤ 50 %  → red    (critical / behind)
 */

export function progressColorClass(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "text-blue-600";
  if (v >= 51) return "text-foreground";
  return "text-red-600";
}

export function progressColorHex(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "#2563eb";
  if (v >= 51) return "#0f172a";
  return "#dc2626";
}
