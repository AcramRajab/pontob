// Variant B — Métricas em Destaque
// Layout: each KRI gets its own sub-card with big % hero number + inputs side by side

import { Users, Building2, TrendingUp } from "lucide-react";

const SAMPLE = {
  quarter: "Q2", label: "2º Trimestre", date: "Jun 2026", hasData: true,
  creci: { actual: 23, target: 27, accent: "#2563eb", accentLight: "#eff6ff", accentBorder: "#bfdbfe" },
  cres:  { actual: 51, target: 59, accent: "#2563eb", accentLight: "#eff6ff", accentBorder: "#bfdbfe" },
  vgh:   { actual: 652966, target: 1025226, accent: "#2563eb", accentLight: "#eff6ff", accentBorder: "#bfdbfe" },
};

function pct(a: number, t: number) { return Math.min(Math.round((a / t) * 100), 999); }

function fmt(v: number, isVgh: boolean) {
  if (!isVgh) return String(v);
  if (v >= 1_000_000) return `R$${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$${Math.round(v/1_000)}k`;
  return `R$${v.toLocaleString("pt-BR")}`;
}

function statusColor(p: number) {
  if (p >= 100) return { text: "#16a34a", bg: "#f0fdf4", label: "Meta atingida" };
  if (p >= 75)  return { text: "#d97706", bg: "#fffbeb", label: "Em progresso" };
  return           { text: "#6b7280", bg: "#f9fafb",  label: "Abaixo" };
}

function KriBlock({
  icon: Icon, label, actual, target, isVgh,
}: { icon: any; label: string; actual: number; target: number; isVgh?: boolean }) {
  const p = pct(actual, target);
  const barPct = Math.min(p, 100);
  const status = statusColor(p);
  const isGood = p >= 100;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
      {/* Top: label + status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
        </div>
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: status.text, backgroundColor: status.bg }}
        >
          {p}% · {status.label}
        </span>
      </div>

      {/* Big numbers: realizado + meta */}
      <div className="flex items-stretch gap-2 mb-3">
        {/* Realizado — dominant */}
        <div className="flex-1 rounded-lg bg-white border border-gray-200 px-3 py-2 shadow-sm">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Realizado</div>
          <input
            className="w-full text-2xl font-black text-gray-900 bg-transparent border-0 focus:outline-none leading-none"
            defaultValue={fmt(actual, !!isVgh)}
            style={{ fontVariantNumeric: "tabular-nums" }}
          />
        </div>

        {/* Divider arrow */}
        <div className="flex items-center text-gray-200 text-lg font-light select-none">→</div>

        {/* Meta */}
        <div className="flex-1 rounded-lg bg-white border border-dashed border-gray-200 px-3 py-2">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Meta</div>
          <input
            className="w-full text-lg font-bold bg-transparent border-0 focus:outline-none leading-none"
            defaultValue={fmt(target, !!isVgh)}
            style={{ color: "#2563eb", fontVariantNumeric: "tabular-nums" }}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barPct}%`,
            backgroundColor: isGood ? "#22c55e" : p >= 75 ? "#f59e0b" : "#3b82f6",
          }}
        />
      </div>
    </div>
  );
}

export function VariantB() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-[380px] rounded-2xl bg-white border border-gray-200 shadow-md overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow">
              {SAMPLE.quarter}
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">{SAMPLE.label}</div>
              <div className="text-base font-bold text-blue-600">{SAMPLE.date}</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
            com dados reais
          </span>
        </div>

        {/* KRI sub-cards */}
        <div className="p-4 space-y-3">
          <KriBlock icon={Users}     label="Corretores CRECI"    actual={SAMPLE.creci.actual} target={SAMPLE.creci.target} />
          <KriBlock icon={Building2} label="Representações (CREs)"actual={SAMPLE.cres.actual}  target={SAMPLE.cres.target} />
          <KriBlock icon={TrendingUp} label="VGH (Honorários)"   actual={SAMPLE.vgh.actual}   target={SAMPLE.vgh.target} isVgh />
        </div>

        <div className="px-5 pb-3">
          <p className="text-[9px] text-gray-300 text-center">Salvo automaticamente · Clique nos valores para editar</p>
        </div>
      </div>
    </div>
  );
}
