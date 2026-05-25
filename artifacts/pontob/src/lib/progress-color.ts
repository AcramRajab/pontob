/**
 * Central progress colour rules (used everywhere in the app):
 *   ≥ 80 %  → blue   (em dia)
 *  51–79 %  → black  (em andamento)
 *   ≤ 50 %  → red    (crítico)
 */

export function progressColorClass(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "text-blue-600";
  if (v >= 51) return "text-foreground";
  return "text-red-600";
}

/** Tailwind class to apply to a Progress bar indicator via [&>div] */
export function progressBarClass(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "[&>div]:bg-blue-500";
  if (v >= 51) return "[&>div]:bg-slate-700";
  return "[&>div]:bg-red-500";
}

export function progressColorHex(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "#2563eb";
  if (v >= 51) return "#0f172a";
  return "#dc2626";
}
