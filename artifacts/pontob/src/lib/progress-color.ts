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

/** bg-* class for a raw <div> progress fill */
export function progressBgClass(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "bg-blue-500";
  if (v >= 51) return "bg-slate-700";
  return "bg-red-500";
}

/** Tailwind class to apply to a Progress bar indicator via [&>div] */
export function progressBarClass(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "[&>div]:bg-blue-500";
  if (v >= 51) return "[&>div]:bg-slate-700";
  return "[&>div]:bg-red-500";
}

/** Badge background+text+border classes for a % badge */
export function progressBadgeClass(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "bg-blue-50 text-blue-700 border-blue-200";
  if (v >= 51) return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-red-50 text-red-600 border-red-200";
}

export function progressColorHex(pct: number | null | undefined): string {
  const v = pct ?? 0;
  if (v >= 80) return "#2563eb";
  if (v >= 51) return "#0f172a";
  return "#dc2626";
}
