import { useState, useEffect, useCallback } from "react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, CheckCircle2,
  AlertTriangle, Target, Loader2, ChevronDown, ChevronUp,
  Flag, Navigation, RefreshCw, Info,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────────────── */

interface QuarterNode {
  label: string; quarter: number; quarterDate: string;
  isPast: boolean; isCurrent: boolean; isFuture: boolean;
  hasTarget: boolean; hasActual: boolean;
  score: number | null;
  status: "future" | "on_track" | "ahead" | "behind" | "critical";
  targets: { creci: number | null; cres: number | null; vgh: number | null };
  actuals: { creci: number | null; cres: number | null; vgh: number | null };
}

interface JourneyPoint {
  index: number; label: string; goalId: number; title: string;
  dimension: string | null; status: string; progressPercentage: number;
  riskStatus: string; startDate: string | null; endDate: string | null;
  unit: string | null; kpis: { id: number; name: string; currentValue: number | null; targetValue: number | null; unit: string | null; progressPct: number | null }[];
  isCurrentPosition: boolean; score: number;
}

interface JourneyData {
  franchiseName: string | null; year: number; statement: string | null;
  overallKriScore: number | null; checkinConsistency: number;
  completedGoals: number; atRiskGoals: number;
  quarterNodes: QuarterNode[]; journeyPoints: JourneyPoint[];
  suggestions: any[];
}

interface AiAnalysis {
  gapAnalysis: string | null; quarterlyOutlook: string | null;
  suggestions: {
    rank: number; initiativeName: string; keyProcess: string; action: string;
    reasoning: string; expectedImpact: string; priority: string;
    usedByTopPerformers: boolean; topPerformerCount: number;
  }[];
  myKriScore: number | null; topPerformersCount: number; analysedAt: string;
}

/* ── focus science data ───────────────────────────────────────────── */

const FOCUS_SCIENCE = {
  optimal_goals: { min: 1, max: 3 },
  optimal_initiatives: { min: 1, max: 3 },
  references: [
    { id: 1, quote: 'Extraordinarios resultados sao obtidos focando em uma coisa de cada vez.', source: "Keller, G. & Papasan, J. — The ONE Thing (2013)" },
    { id: 2, quote: 'Metas dificeis e especificas levam a desempenho superior; mas apenas quando em numero gerenciavel.', source: "Locke, E.A. & Latham, G.P. — Goal Setting Theory (2002, Applied Psychology)" },
    { id: 3, quote: 'A atencao dividida por multiplas iniciativas reduz a capacidade cognitiva de execucao em ate 40%.', source: "Meyer, D.E. et al. — Executive Control of Cognitive Processes (2001, Journal of Experimental Psychology)" },
    { id: 4, quote: 'Menos iniciativas bem executadas geram mais resultado do que muitas executadas pela metade.', source: "Collins, J. — Good to Great (2001) — Hedgehog Concept" },
  ],
};

function getFocusScore(activeGoals: number, totalInitiatives: number): { score: number; label: string; color: string; recommendation: string } {
  if (activeGoals <= 1 && totalInitiatives <= 3) return { score: 100, label: "Foco máximo", color: "text-emerald-600", recommendation: "Parabéns — você está com foco máximo. Mantenha a disciplina." };
  if (activeGoals <= 3 && totalInitiatives <= 6) return { score: 85, label: "Bom foco", color: "text-blue-600", recommendation: "Foco saudável. Antes de adicionar mais, garanta execução plena das atuais." };
  if (activeGoals <= 5 && totalInitiatives <= 9) return { score: 60, label: "Atenção ao foco", color: "text-amber-600", recommendation: `Você tem ${activeGoals} metas ativas. A ciência sugere máx. 3 para execução de alta performance. Considere pausar as menos críticas.` };
  return { score: 30, label: "Dispersão de foco", color: "text-red-600", recommendation: `${activeGoals} metas ativas é acima do ideal. Mais metas = menos resultado por meta. Priorize as 1-3 mais importantes agora.` };
}

/* ── helpers ──────────────────────────────────────────────────────── */

const STATUS_CONFIG = {
  ahead:    { label: "Adiantado",    bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  on_track: { label: "No prazo",     bg: "bg-blue-50",     border: "border-blue-200",    text: "text-blue-700",    dot: "bg-blue-500"    },
  behind:   { label: "Abaixo",       bg: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-500"   },
  critical: { label: "Crítico",      bg: "bg-red-50",      border: "border-red-200",     text: "text-red-700",     dot: "bg-red-500"     },
  future:   { label: "Futuro",       bg: "bg-slate-50",    border: "border-slate-200",   text: "text-slate-500",   dot: "bg-slate-300"   },
};

const GOAL_STATUS = {
  concluida:    { label: "Concluída",    color: "#10b981" },
  em_andamento: { label: "Em andamento", color: "#3b82f6" },
  atrasada:     { label: "Atrasada",     color: "#ef4444" },
  nao_iniciada: { label: "Não iniciada", color: "#94a3b8" },
};

function formatVal(v: number | null) { return v != null ? v.toLocaleString("pt-BR") : "—"; }

/* ── component ────────────────────────────────────────────────────── */

export default function Jornada() {
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
  const [year, setYear]   = useState(new Date().getFullYear());
  const [data, setData]   = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis,  setAnalysis]  = useState<AiAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [expandedQ, setExpandedQ]  = useState<number | null>(null);
  const [expandedG, setExpandedG]  = useState<number | null>(null);
  const [showScience, setShowScience] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (franchiseId) params.set("franchiseId", String(franchiseId));
      const r = await fetch(`/api/journey?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message ?? "Erro ao carregar dados."); }
    finally { setLoading(false); }
  }, [year, franchiseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function runAnalysis() {
    setAnalyzing(true); setAnalysisError(null);
    try {
      const r = await fetch("/api/journey/analyze", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, franchiseId }),
      });
      if (!r.ok) throw new Error(await r.text());
      setAnalysis(await r.json());
    } catch (e: any) { setAnalysisError(e.message ?? "Erro na análise."); }
    finally { setAnalyzing(false); }
  }

  async function sendFeedback(id: number, action: string) {
    setFeedbackMap(m => ({ ...m, [id]: action }));
    await fetch(`/api/journey/suggestions/${id}/feedback`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }

  /* ── derived ── */
  const activeGoals = data?.journeyPoints.filter(p => p.status === "em_andamento").length ?? 0;
  const totalInits  = data?.journeyPoints.reduce((s, p) => s + p.kpis.length, 0) ?? 0; // proxy
  const focus       = getFocusScore(activeGoals, totalInits);
  const currentQ    = data?.quarterNodes.find(q => q.isCurrent) ?? null;
  const now         = new Date();
  const currentYear = now.getFullYear();

  /* ── timeline SVG nodes ── */
  const timelineNodes = [
    { id: "start", label: "Início", sublabel: `Jan ${year}`, type: "start" },
    ...(data?.quarterNodes ?? []).map(q => ({ id: `q${q.quarter}`, label: q.label, sublabel: q.quarterDate.slice(0,7), type: "quarter", data: q })),
    { id: "z", label: "Ponto Z", sublabel: `Dez ${year}`, type: "end" },
  ];

  const nodeCount  = timelineNodes.length;
  const svgW       = Math.max(nodeCount * 130, 780);
  const svgH       = 130;
  const nodeY      = 55;
  const nodeR      = 22;
  const xOf        = (i: number) => 65 + (i * (svgW - 130)) / (nodeCount - 1);

  function nodeColor(node: typeof timelineNodes[0]) {
    if (node.type === "start") return "#6366f1";
    if (node.type === "end")   return "#f59e0b";
    const d = (node as any).data as QuarterNode;
    if (!d) return "#94a3b8";
    const map: Record<string, string> = { ahead:"#10b981", on_track:"#3b82f6", behind:"#f59e0b", critical:"#ef4444", future:"#cbd5e1" };
    return map[d.status] ?? "#94a3b8";
  }

  function lineFill(i: number) {
    if (i === 0) return "#6366f1";
    const prev = timelineNodes[i];
    if (prev.type === "end") return "#f59e0b44";
    const d = (prev as any).data as QuarterNode | undefined;
    if (!d || d.isFuture) return "#e2e8f0";
    const map: Record<string, string> = { ahead:"#10b981", on_track:"#3b82f6", behind:"#f59e0b", critical:"#ef4444", future:"#e2e8f0" };
    return map[d.status] ?? "#e2e8f0";
  }

  /* ── render ── */
  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapa de Jornada</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data?.franchiseName ?? (franchiseId ? "Franquia" : "Selecione uma franquia")} · Do Ponto A ao Ponto Z
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={!franchiseId} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* ── Franchise picker (admin/staff only) ── */}
      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {/* ── No franchise selected (admin) ── */}
      {!franchiseId && (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o Mapa de Jornada." />
      )}

      {/* ── Loading ── */}
      {franchiseId && loading && (
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /><span>Carregando mapa de jornada…</span>
        </div>
      )}

      {/* ── Error ── */}
      {franchiseId && !loading && error && (
        <div className="p-6 text-red-600 text-sm">{error}</div>
      )}

      {/* ── Content (only when data loaded) ── */}
      {franchiseId && !loading && !error && data && (<>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Score KRI", value: data?.overallKriScore != null ? `${data.overallKriScore}%` : "—", sub: "vs meta trimestral" },
          { label: "Check-in 30d", value: `${data?.checkinConsistency ?? 0}%`, sub: "consistência diária" },
          { label: "Metas concluídas", value: String(data?.completedGoals ?? 0), sub: `de ${data?.journeyPoints.length ?? 0} no ano` },
          { label: "Em risco", value: String(data?.atRiskGoals ?? 0), sub: "metas atrasadas" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Ponto Z: Visão ── */}
      {data?.statement ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 items-start">
          <div className="h-10 w-10 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
            <Flag className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Ponto Z · Visão {year}</p>
            <p className="text-slate-800 font-medium">{data.statement}</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 flex gap-4 items-center text-slate-400 text-sm">
          <Flag className="h-5 w-5" />
          Ponto Z não definido. Configure sua Visão Anual para habilitar o mapa completo.
        </div>
      )}

      {/* ── Timeline SVG ── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Caminho percorrido</p>
        <svg width={svgW} height={svgH} className="overflow-visible">
          {/* connecting lines */}
          {timelineNodes.map((_, i) => {
            if (i === 0) return null;
            const x1 = xOf(i - 1) + nodeR;
            const x2 = xOf(i) - nodeR;
            return (
              <line key={i} x1={x1} y1={nodeY} x2={x2} y2={nodeY}
                stroke={lineFill(i)} strokeWidth={4} strokeLinecap="round" />
            );
          })}

          {/* nodes */}
          {timelineNodes.map((node, i) => {
            const x = xOf(i);
            const isEnd = node.type === "end";
            const isStart = node.type === "start";
            const qData = (node as any).data as QuarterNode | undefined;
            const isCurrent = qData?.isCurrent ?? false;
            const color = nodeColor(node);

            return (
              <g key={node.id} onClick={() => {
                if (node.type === "quarter") setExpandedQ(expandedQ === i ? null : i);
              }} style={{ cursor: node.type === "quarter" ? "pointer" : "default" }}>
                {/* pulse ring for current */}
                {isCurrent && (
                  <circle cx={x} cy={nodeY} r={nodeR + 8} fill={color + "22"} stroke={color + "44"} strokeWidth={2} />
                )}
                {/* main circle */}
                <circle cx={x} cy={nodeY} r={nodeR} fill={isEnd ? "#fbbf24" : isStart ? "#6366f1" : (qData?.isFuture ? "#f8fafc" : color)}
                  stroke={color} strokeWidth={isEnd || isStart ? 3 : 2}
                />
                {/* label */}
                <text x={x} y={nodeY + 5} textAnchor="middle" fontSize={isEnd ? 11 : 12}
                  fontWeight="700" fill={isEnd ? "#92400e" : isStart ? "white" : (qData?.isFuture ? "#94a3b8" : "white")}>
                  {isEnd ? "Z" : node.label.replace("ºTRI", "")}
                </text>
                {/* sublabel below */}
                <text x={x} y={nodeY + nodeR + 16} textAnchor="middle" fontSize={10} fill="#94a3b8">
                  {node.label}
                </text>
                <text x={x} y={nodeY + nodeR + 28} textAnchor="middle" fontSize={9} fill="#cbd5e1">
                  {node.sublabel}
                </text>
                {/* score badge */}
                {qData?.score != null && !qData.isFuture && (
                  <text x={x} y={nodeY - nodeR - 8} textAnchor="middle" fontSize={10} fontWeight="700" fill={color}>
                    {qData.score}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* expanded quarter detail */}
        {expandedQ !== null && timelineNodes[expandedQ]?.type === "quarter" && (() => {
          const q = (timelineNodes[expandedQ] as any).data as QuarterNode;
          const cfg = STATUS_CONFIG[q.status];
          return (
            <div className={`mt-4 rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`font-semibold text-sm ${cfg.text}`}>{q.label} — {q.quarterDate.slice(0,7)}</p>
                <Badge variant="outline" className={`text-xs ${cfg.text} ${cfg.border}`}>{cfg.label}</Badge>
              </div>
              {q.hasTarget || q.hasActual ? (
                <div className="grid grid-cols-3 gap-3">
                  {(["creci","cres","vgh"] as const).map(k => (
                    <div key={k} className="bg-white/70 rounded-lg p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{k.toUpperCase()}</p>
                      <p className="text-base font-bold text-slate-800">{formatVal(q.actuals[k])}</p>
                      <p className="text-xs text-slate-400">Meta: {formatVal(q.targets[k])}</p>
                      {q.targets[k] && q.actuals[k] != null && (
                        <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min((q.actuals[k]! / q.targets[k]!) * 100, 100)}%`, backgroundColor: nodeColor(timelineNodes[expandedQ!]) }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sem dados configurados para este trimestre. Configure na Visão Anual.</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Focus Advisor ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Target className="h-5 w-5 text-indigo-500" />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Focus Advisor</p>
              <p className="text-xs text-slate-400">Baseado na ciência de definição e execução de metas</p>
            </div>
          </div>
          <button onClick={() => setShowScience(!showScience)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            {showScience ? "Ocultar" : "Ver"} referências
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* focus score gauge */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle cx="32" cy="32" r="26" fill="none"
                  stroke={focus.score >= 80 ? "#10b981" : focus.score >= 60 ? "#3b82f6" : focus.score >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(focus.score / 100) * 163} 163`}
                />
              </svg>
              <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 rotate-0">{focus.score}</p>
            </div>
            <div>
              <p className={`font-bold text-base ${focus.color}`}>{focus.label}</p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-md">{focus.recommendation}</p>
            </div>
          </div>

          {/* metrics */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Metas ativas", value: activeGoals, ideal: "1 – 3", ok: activeGoals <= 3 },
              { label: "Checkin 30d", value: `${data?.checkinConsistency ?? 0}%`, ideal: "> 80%", ok: (data?.checkinConsistency ?? 0) >= 80 },
              { label: "Score KRI", value: data?.overallKriScore != null ? `${data.overallKriScore}%` : "—", ideal: "> 80%", ok: (data?.overallKriScore ?? 0) >= 80 },
            ].map(m => (
              <div key={m.label} className={`rounded-xl p-3 border ${m.ok ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                <p className="text-xs text-slate-500">{m.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${m.ok ? "text-emerald-700" : "text-amber-700"}`}>{m.value}</p>
                <p className="text-[10px] text-slate-400">Ideal: {m.ideal}</p>
              </div>
            ))}
          </div>

          {/* science citations */}
          {showScience && (
            <div className="border border-indigo-100 bg-indigo-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Referências científicas</p>
              {FOCUS_SCIENCE.references.map(r => (
                <div key={r.id} className="flex gap-2.5">
                  <span className="text-indigo-300 text-sm mt-0.5 shrink-0">›</span>
                  <div>
                    <p className="text-xs text-slate-700 italic">{r.quote}</p>
                    <p className="text-[10px] text-indigo-500 mt-0.5">📚 {r.source}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Goal Journey Points ── */}
      {(data?.journeyPoints.length ?? 0) > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <p className="font-semibold text-slate-900 text-sm">Metas — Waypoints da Jornada</p>
            <p className="text-xs text-slate-400 mt-0.5">Cada meta é um ponto no caminho do Ponto A ao Ponto Z</p>
          </div>
          <div className="divide-y divide-slate-50">
            {data!.journeyPoints.map((p, idx) => {
              const statusCfg = GOAL_STATUS[p.status as keyof typeof GOAL_STATUS] ?? GOAL_STATUS.nao_iniciada;
              const isExpanded = expandedG === idx;
              return (
                <div key={p.goalId}>
                  <button
                    onClick={() => setExpandedG(isExpanded ? null : idx)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    {/* point label */}
                    <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: p.isCurrentPosition ? "#6366f1" : statusCfg.color }}>
                      {p.label}
                    </div>
                    {/* info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{p.title}</p>
                        {p.isCurrentPosition && (
                          <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-600 shrink-0">Você está aqui</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{p.dimension} · {statusCfg.label}</p>
                    </div>
                    {/* progress */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-base font-bold text-slate-800">{p.progressPercentage}%</p>
                        {p.riskStatus === "atrasado" && <p className="text-[10px] text-red-500">Atrasado</p>}
                        {p.riskStatus === "adiantado" && <p className="text-[10px] text-emerald-500">Adiantado</p>}
                      </div>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.progressPercentage}%`, backgroundColor: statusCfg.color }} />
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-300" /> : <ChevronDown className="h-4 w-4 text-slate-300" />}
                    </div>
                  </button>

                  {isExpanded && p.kpis.length > 0 && (
                    <div className="px-5 pb-4 grid grid-cols-3 gap-3">
                      {p.kpis.map(k => (
                        <div key={k.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold truncate">{k.name}</p>
                          <p className="text-lg font-bold text-slate-800 mt-0.5">{k.currentValue ?? "—"} <span className="text-xs text-slate-400">{k.unit}</span></p>
                          <p className="text-xs text-slate-400">Meta: {k.targetValue ?? "—"} {k.unit}</p>
                          {k.progressPct != null && (
                            <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${k.progressPct}%` }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI Analysis ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Análise Inteligente</p>
              <p className="text-xs text-slate-400">IA cruza seus dados com franquias de melhor desempenho</p>
            </div>
          </div>
          <Button onClick={runAnalysis} disabled={analyzing} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            {analyzing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analisando…</> : <><Sparkles className="h-3.5 w-3.5" />Analisar com IA</>}
          </Button>
        </div>

        {!analysis && !analyzing && !analysisError && (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Navigation className="h-8 w-8 mx-auto mb-3 opacity-30" />
            Clique em "Analisar com IA" para gerar sugestões baseadas nos dados de todas as franquias.
          </div>
        )}

        {analysisError && (
          <div className="p-5 text-sm text-red-600">{analysisError}</div>
        )}

        {analysis && (
          <div className="p-5 space-y-5">
            {/* gap analysis */}
            {analysis.gapAnalysis && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Diagnóstico</p>
                <p className="text-sm text-slate-700">{analysis.gapAnalysis}</p>
              </div>
            )}
            {/* outlook */}
            {analysis.quarterlyOutlook && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Previsão trimestral</p>
                <p className="text-sm text-indigo-800">{analysis.quarterlyOutlook}</p>
              </div>
            )}
            {/* suggestions */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Iniciativas recomendadas</p>
              {analysis.suggestions.map((s, i) => {
                const fb = feedbackMap[i];
                const priorityColor: Record<string, string> = { alta: "text-red-600 bg-red-50 border-red-200", media: "text-amber-600 bg-amber-50 border-amber-200", baixa: "text-slate-500 bg-slate-50 border-slate-200" };
                const actionLabel: Record<string, string> = { adicionar: "Adicionar", priorizar: "Priorizar", remover: "Remover", substituir: "Substituir" };
                return (
                  <div key={i} className={`rounded-xl border p-4 transition-opacity ${fb ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">#{s.rank}</span>
                        <span className="font-semibold text-sm text-slate-900">{s.initiativeName}</span>
                        <Badge variant="outline" className={`text-[10px] ${priorityColor[s.priority] ?? priorityColor.media}`}>{s.priority}</Badge>
                        {s.usedByTopPerformers && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">
                            ✓ {s.topPerformerCount} franquia(s) top usam
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{actionLabel[s.action] ?? s.action}</Badge>
                    </div>
                    {s.keyProcess && <p className="text-[10px] text-slate-400 mb-2">{s.keyProcess}</p>}
                    <p className="text-xs text-slate-600 mb-1">{s.reasoning}</p>
                    <p className="text-xs text-indigo-600">→ {s.expectedImpact}</p>
                    {!fb && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => sendFeedback(i, "accepted")} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">✓ Adotar</button>
                        <button onClick={() => sendFeedback(i, "deferred")} className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">⟳ Depois</button>
                        <button onClick={() => sendFeedback(i, "rejected")} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">✕ Não se aplica</button>
                      </div>
                    )}
                    {fb && <p className="text-xs text-slate-400 mt-2 italic">Feedback registrado: {fb === "accepted" ? "Adotado" : fb === "deferred" ? "Para depois" : "Não se aplica"}</p>}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-300 text-right">Análise gerada em {new Date(analysis.analysedAt).toLocaleString("pt-BR")}</p>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}
