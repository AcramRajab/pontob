// Variant A — Colunas Claras
// Layout: header strip + column headers (Realizado | Meta) + progress bar per KRI

import { Users, Building2, TrendingUp } from "lucide-react";

const SAMPLE = {
  quarter: "Q2", label: "2º Trimestre", date: "Jun 2026", hasData: true,
  creci: { actual: 23, target: 27 },
  cres:  { actual: 51, target: 59 },
  vgh:   { actual: 652966, target: 1025226 },
};

function pct(a: number, t: number) { return Math.min(Math.round((a / t) * 100), 999); }

function fmt(v: number, isVgh: boolean) {
  if (!isVgh) return String(v);
  if (v >= 1_000_000) return `R$${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$${Math.round(v/1_000)}k`;
  return `R$${v}`;
}

function KriRow({
  icon: Icon, label, actual, target, isVgh, accent,
}: { icon: any; label: string; actual: number; target: number; isVgh?: boolean; accent: string }) {
  const p = pct(actual, target);
  const isGood = p >= 100;
  const barPct = Math.min(p, 100);
  const barColor = isGood ? "#22c55e" : p >= 75 ? "#f59e0b" : accent;

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3 w-3 text-gray-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      </div>

      {/* Values row */}
      <div className="flex items-end gap-3 mb-2">
        {/* Realizado */}
        <div className="flex-1">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Realizado</div>
          <input
            className="w-full text-2xl font-bold text-gray-900 bg-transparent border-0 border-b-2 border-gray-200 focus:border-violet-400 focus:outline-none pb-0.5 leading-none"
            defaultValue={fmt(actual, !!isVgh)}
            style={{ fontVariantNumeric: "tabular-nums" }}
          />
        </div>

        {/* % badge */}
        <div className="shrink-0 flex flex-col items-center pb-1">
          <span
            className="text-base font-black leading-none"
            style={{ color: isGood ? "#22c55e" : p >= 75 ? "#f59e0b" : "#6b7280" }}
          >
            {p}%
          </span>
          <span className="text-[8px] text-gray-300 font-medium mt-0.5">atingido</span>
        </div>

        {/* Meta */}
        <div className="flex-1 text-right">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Meta</div>
          <input
            className="w-full text-right text-base font-semibold bg-transparent border-0 border-b-2 border-dashed border-gray-200 focus:border-violet-400 focus:outline-none pb-0.5 leading-none"
            defaultValue={fmt(target, !!isVgh)}
            style={{ color: accent, fontVariantNumeric: "tabular-nums" }}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${barPct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export function VariantA() {
  const accent = "#7c3aed";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-[360px] rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">

        {/* Header strip */}
        <div className="px-5 py-4 bg-violet-50 border-b border-violet-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {SAMPLE.quarter}
              </div>
              <div>
                <div className="text-xs text-violet-500 font-medium leading-none">{SAMPLE.label}</div>
                <div className="text-sm font-bold text-violet-700 leading-tight mt-0.5">{SAMPLE.date}</div>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
              com dados reais
            </span>
          </div>
        </div>

        {/* KRI rows */}
        <div className="px-5">
          <KriRow icon={Users}     label="Corretores CRECI"   accent={accent} actual={SAMPLE.creci.actual} target={SAMPLE.creci.target} />
          <KriRow icon={Building2} label="Representações (CREs)" accent={accent} actual={SAMPLE.cres.actual}  target={SAMPLE.cres.target}  />
          <KriRow icon={TrendingUp} label="VGH (Honorários)"  accent={accent} actual={SAMPLE.vgh.actual}  target={SAMPLE.vgh.target} isVgh />
        </div>

        <div className="px-5 py-2.5 border-t border-gray-50">
          <p className="text-[9px] text-gray-300 text-center">Valores salvos automaticamente</p>
        </div>
      </div>
    </div>
  );
}
