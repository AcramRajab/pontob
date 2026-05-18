// Variant C — Compacta e Densa
// Layout: table-style rows, inline edits, all info at a glance

import { Users, Building2, TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";

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

function StatusIcon({ p }: { p: number }) {
  if (p >= 100) return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (p >= 75)  return <Clock className="h-3.5 w-3.5 text-amber-400" />;
  return              <AlertCircle className="h-3.5 w-3.5 text-gray-300" />;
}

function KriRow({
  icon: Icon, label, actual, target, isVgh,
}: { icon: any; label: string; actual: number; target: number; isVgh?: boolean }) {
  const p = pct(actual, target);
  const barPct = Math.min(p, 100);
  const isGood = p >= 100;
  const barColor = isGood ? "#22c55e" : p >= 75 ? "#f59e0b" : "#94a3b8";
  const pctColor = isGood ? "#16a34a" : p >= 75 ? "#d97706" : "#64748b";

  return (
    <div className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors group">
      {/* Row top: icon + label + status */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-gray-300 shrink-0" />
        <span className="text-[11px] font-semibold text-gray-500 flex-1">{label}</span>
        <StatusIcon p={p} />
      </div>

      {/* Row bottom: realizado input + bar + % + meta input */}
      <div className="flex items-center gap-2">
        {/* Realizado */}
        <div className="flex flex-col" style={{ width: 72 }}>
          <span className="text-[8px] text-gray-300 font-semibold uppercase tracking-wide leading-none mb-0.5">Realizado</span>
          <input
            className="text-sm font-black text-gray-900 bg-transparent border-0 border-b border-gray-200 focus:border-violet-400 focus:outline-none leading-none w-full py-0.5"
            defaultValue={fmt(actual, !!isVgh)}
            style={{ fontVariantNumeric: "tabular-nums" }}
          />
        </div>

        {/* Progress bar + % */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${barPct}%`, backgroundColor: barColor }}
              />
            </div>
            <span
              className="ml-2 text-[10px] font-black tabular-nums shrink-0"
              style={{ color: pctColor, minWidth: 32, textAlign: "right" }}
            >
              {p}%
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end" style={{ width: 72 }}>
          <span className="text-[8px] text-gray-300 font-semibold uppercase tracking-wide leading-none mb-0.5">Meta</span>
          <input
            className="text-sm font-semibold bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-violet-400 focus:outline-none leading-none w-full text-right py-0.5"
            defaultValue={fmt(target, !!isVgh)}
            style={{ color: "#7c3aed", fontVariantNumeric: "tabular-nums" }}
          />
        </div>
      </div>
    </div>
  );
}

// Summary badge
function OverallBadge() {
  const avg = pct(
    SAMPLE.creci.actual + SAMPLE.cres.actual,
    SAMPLE.creci.target + SAMPLE.cres.target
  );
  return (
    <div className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 shadow-sm">
      <div className="text-base font-black text-gray-800 tabular-nums leading-none">{avg}%</div>
      <div className="text-[9px] text-gray-400 leading-tight">média<br/>KRIs</div>
    </div>
  );
}

export function VariantC() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-[380px] rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-black text-sm">
              {SAMPLE.quarter}
            </div>
            <div>
              <div className="text-[10px] text-violet-200 font-medium leading-none">{SAMPLE.label}</div>
              <div className="text-sm font-bold text-white leading-tight">{SAMPLE.date}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OverallBadge />
            <span className="text-[9px] font-semibold text-violet-200 bg-white/10 px-2 py-1 rounded-full border border-white/20">
              dados reais
            </span>
          </div>
        </div>

        {/* Column headers */}
        <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <div className="w-[18px]" />
          <div className="flex-1 text-[9px] font-semibold text-gray-300 uppercase tracking-widest">Indicador</div>
          <div style={{ width: 72 }} className="text-[9px] font-semibold text-gray-300 uppercase tracking-widest">Realizado</div>
          <div className="flex-1 text-center text-[9px] font-semibold text-gray-300 uppercase tracking-widest">Progresso</div>
          <div style={{ width: 72 }} className="text-right text-[9px] font-semibold text-gray-300 uppercase tracking-widest">Meta</div>
        </div>

        {/* KRI rows */}
        <div>
          <KriRow icon={Users}     label="Corretores CRECI"    actual={SAMPLE.creci.actual} target={SAMPLE.creci.target} />
          <KriRow icon={Building2} label="Representações (CREs)"actual={SAMPLE.cres.actual}  target={SAMPLE.cres.target} />
          <KriRow icon={TrendingUp} label="VGH (Honorários)"   actual={SAMPLE.vgh.actual}   target={SAMPLE.vgh.target} isVgh />
        </div>

        <div className="px-4 py-2 border-t border-gray-50">
          <p className="text-[9px] text-gray-300 text-center">Salvo automaticamente · Clique nos valores para editar</p>
        </div>
      </div>
    </div>
  );
}
