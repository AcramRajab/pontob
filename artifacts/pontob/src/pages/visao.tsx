import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Pencil, Check, X, Users, Building2, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Milestone {
  id: number;
  quarterDate: string;
  quarterLabel: string;
  targetCreci: number | null;
  targetCres: number | null;
  targetVgh: number | null;
}
interface QuarterActual {
  quarterDate: string;
  quarterLabel: string;
  actualCreci: number | null;
  actualCres: number | null;
  actualVgh: number | null;
}
interface VisaoData {
  franchiseId: number;
  year: number;
  visao: { id: number; statement: string | null } | null;
  milestones: Milestone[];
  quarterActuals: QuarterActual[];
}

const QUARTERS = [
  { label: "1º Trimestre", short: "Q1", month: "Mar", date: (y: number) => `${y}-03-31`, display: (y: number) => `Mar ${y}` },
  { label: "2º Trimestre", short: "Q2", month: "Jun", date: (y: number) => `${y}-06-30`, display: (y: number) => `Jun ${y}` },
  { label: "3º Trimestre", short: "Q3", month: "Set", date: (y: number) => `${y}-09-30`, display: (y: number) => `Set ${y}` },
  { label: "4º Trimestre", short: "Q4", month: "Dez", date: (y: number) => `${y}-12-31`, display: (y: number) => `Dez ${y}` },
];

const Q_CONFIG = [
  {
    accent: "text-blue-600",
    accentBg: "bg-blue-600",
    accentLight: "bg-blue-50",
    accentBorder: "border-blue-100",
    bar: "bg-blue-500",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
  },
  {
    accent: "text-violet-600",
    accentBg: "bg-violet-600",
    accentLight: "bg-violet-50",
    accentBorder: "border-violet-100",
    bar: "bg-violet-500",
    ring: "ring-violet-200",
    dot: "bg-violet-500",
  },
  {
    accent: "text-amber-600",
    accentBg: "bg-amber-500",
    accentLight: "bg-amber-50",
    accentBorder: "border-amber-100",
    bar: "bg-amber-500",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
  },
  {
    accent: "text-emerald-600",
    accentBg: "bg-emerald-600",
    accentLight: "bg-emerald-50",
    accentBorder: "border-emerald-100",
    bar: "bg-emerald-500",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
  },
];

function formatVgh(v: number | null | undefined, compact = false) {
  if (v == null) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}k`;
  return "R$ " + v.toLocaleString("pt-BR");
}

function pct(actual: number | null | undefined, target: number | null | undefined): number | null {
  if (actual == null || target == null || target === 0) return null;
  return Math.min(Math.round((actual / target) * 100), 999);
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function KriBlock({
  icon: Icon,
  label,
  target,
  actual,
  targetRaw,
  isVgh,
  canWrite,
  onChange,
  cfg,
}: {
  icon: any;
  label: string;
  target: number | null;
  actual: number | null;
  targetRaw: string | number;
  isVgh?: boolean;
  canWrite: boolean;
  onChange: (v: string) => void;
  cfg: (typeof Q_CONFIG)[0];
}) {
  const p = pct(actual, target);
  const capped = p != null ? Math.min(p, 100) : 0;
  const isGood = p != null && p >= 100;
  const hasActual = actual != null;
  const hasTarget = target != null && target !== 0;

  const barColor = isGood ? "bg-green-500" : p != null && p >= 75 ? "bg-amber-400" : cfg.bar;

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3", cfg.accent)} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>

      {/* Values row */}
      <div className="flex items-end justify-between gap-2">
        {/* Actual value */}
        <div className="min-w-0">
          {hasActual ? (
            <div className="flex items-baseline gap-1">
              <span className={cn("text-xl font-bold tabular-nums leading-none", isGood ? "text-green-600" : "text-foreground")}>
                {isVgh ? formatVgh(actual) : actual}
              </span>
              {p != null && (
                <span className={cn("text-xs font-semibold", isGood ? "text-green-500" : "text-muted-foreground")}>
                  {p}%
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/50 italic">sem dados</span>
          )}
        </div>

        {/* Target input or display */}
        {canWrite ? (
          <div className="relative shrink-0">
            <Input
              type="number"
              min={0}
              step={isVgh ? 1000 : 1}
              defaultValue={targetRaw === null ? "" : targetRaw}
              placeholder={hasTarget ? undefined : "meta"}
              className={cn(
                "text-right text-sm font-semibold h-8 pr-2 border-0 border-b-2 border-dashed bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-solid",
                isVgh ? "w-28" : "w-20",
                cfg.accent,
                "placeholder:text-muted-foreground/30 placeholder:font-normal placeholder:text-xs"
              )}
              onChange={e => onChange(e.target.value)}
            />
            {hasTarget && (
              <div className="absolute -bottom-4 right-0 text-[9px] text-muted-foreground/50 font-medium">
                {isVgh ? formatVgh(target) : `meta: ${target}`}
              </div>
            )}
          </div>
        ) : (
          <span className={cn("text-sm font-semibold shrink-0", cfg.accent)}>
            {isVgh ? formatVgh(target) : (target != null ? target : "—")}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {hasTarget && (
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden mt-1">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${capped}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function Visao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const franchiseId = user?.franchiseId;
  const [year, setYear] = useState(new Date().getFullYear());
  const [editingStatement, setEditingStatement] = useState(false);
  const [statementDraft, setStatementDraft] = useState("");
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const canWrite = user?.role !== "responsavel_interno";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const queryKey = ["visao", franchiseId, year];

  const { data, isLoading } = useQuery<VisaoData>({
    queryKey,
    queryFn: () => apiFetch(`/api/visao?franchiseId=${franchiseId}&year=${year}`),
    enabled: !!franchiseId,
  });

  useEffect(() => {
    if (!editingStatement && data) setStatementDraft(data.visao?.statement ?? "");
  }, [data, editingStatement]);

  useEffect(() => {
    if (editingStatement && textareaRef.current) textareaRef.current.focus();
  }, [editingStatement]);

  const saveStatement = useMutation({
    mutationFn: (statement: string) =>
      apiFetch("/api/visao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franchiseId, year, statement }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingStatement(false);
      toast({ title: "Visão salva" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const saveMilestone = useMutation({
    mutationFn: (body: object) =>
      apiFetch("/api/visao/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast({ title: "Erro ao salvar meta", variant: "destructive" }),
  });

  const getMilestone = useCallback((quarterDate: string) => {
    return data?.milestones?.find((m: any) => m.quarterDate === quarterDate) ?? null;
  }, [data]);

  const getActual = useCallback((quarterDate: string) => {
    return data?.quarterActuals?.find((q: any) => q.quarterDate === quarterDate) ?? null;
  }, [data]);

  const handleMilestoneChange = useCallback(
    (quarterDate: string, quarterLabel: string, field: "targetCreci" | "targetCres" | "targetVgh", raw: string) => {
      if (!franchiseId) return;
      const key = `${quarterDate}-${field}`;
      clearTimeout(debounceRef.current[key]);
      debounceRef.current[key] = setTimeout(() => {
        const existing = getMilestone(quarterDate);
        const val = raw === "" ? null : parseFloat(raw);
        saveMilestone.mutate({
          franchiseId, year, quarterDate, quarterLabel,
          targetCreci: field === "targetCreci" ? val : (existing?.targetCreci ?? null),
          targetCres: field === "targetCres" ? val : (existing?.targetCres ?? null),
          targetVgh: field === "targetVgh" ? val : (existing?.targetVgh ?? null),
        });
      }, 600);
    },
    [franchiseId, year, getMilestone, saveMilestone]
  );

  const franchiseName = user?.franchiseName ?? "Franquia";
  const hasStatement = !!data?.visao?.statement;
  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Planejamento estratégico</p>
          <h1 className="text-2xl font-bold tracking-tight">{franchiseName}</h1>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-0.5 rounded-xl border bg-card shadow-sm p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={cn(
            "font-bold text-base px-4 min-w-[64px] text-center tabular-nums",
            year === currentYear ? "text-primary" : "text-foreground"
          )}>
            {year}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Vision Statement ── */}
      <div className={cn(
        "group relative rounded-2xl border transition-all duration-200",
        editingStatement
          ? "border-primary/40 shadow-lg shadow-primary/5 bg-card"
          : hasStatement
          ? "border-border bg-card hover:border-primary/30 hover:shadow-sm cursor-pointer"
          : "border-dashed border-border/60 bg-muted/20 hover:border-primary/30 cursor-pointer"
      )}
        onClick={() => !editingStatement && canWrite && (setStatementDraft(data?.visao?.statement ?? ""), setEditingStatement(true))}
      >
        {/* Left accent bar */}
        <div className={cn("absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-primary transition-opacity", editingStatement || hasStatement ? "opacity-100" : "opacity-30")} />

        <div className="px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Declaração de Visão {year}
              </p>
              {editingStatement ? (
                <textarea
                  ref={textareaRef}
                  value={statementDraft}
                  onChange={e => setStatementDraft(e.target.value)}
                  rows={3}
                  className="w-full text-lg leading-relaxed italic bg-transparent border-0 focus:outline-none resize-none placeholder:text-muted-foreground/40 placeholder:not-italic placeholder:text-base"
                  placeholder={`"Em dezembro de ${year}, a ${franchiseName} terá X corretores ativos, Y representações e alcançará R$ Z em honorários..."`}
                />
              ) : hasStatement ? (
                <p className="text-lg leading-relaxed italic text-foreground/80">
                  "{data?.visao?.statement}"
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/60">
                  {canWrite ? `Clique para escrever a declaração de visão para ${year}` : `Nenhuma visão registrada para ${year}.`}
                </p>
              )}
            </div>

            {canWrite && (
              <div className="shrink-0 flex gap-2 mt-0.5" onClick={e => e.stopPropagation()}>
                {editingStatement ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg"
                      onClick={() => { setEditingStatement(false); setStatementDraft(data?.visao?.statement ?? ""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="h-8 px-4 rounded-lg"
                      onClick={() => saveStatement.mutate(statementDraft)}
                      disabled={saveStatement.isPending}>
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Salvar
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm"
                    className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setStatementDraft(data?.visao?.statement ?? ""); setEditingStatement(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section label ── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-2">
          Marcos Trimestrais — KRIs
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ── Quarter Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-72 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {QUARTERS.map((q, idx) => {
            const qDate = q.date(year);
            const milestone = getMilestone(qDate);
            const actual = getActual(qDate);
            const cfg = Q_CONFIG[idx];
            const isFinal = idx === 3;
            const hasData = actual?.actualCreci != null;
            const hasTargets = !!(milestone?.targetCreci || milestone?.targetCres || milestone?.targetVgh);

            return (
              <div
                key={qDate}
                className={cn(
                  "rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-px",
                  isFinal ? "ring-1 " + cfg.ring : ""
                )}
              >
                {/* Card header strip */}
                <div className={cn("px-5 pt-5 pb-4")}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold", cfg.accentBg)}>
                        {q.short}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground leading-none">{q.label}</div>
                        <div className={cn("text-sm font-semibold leading-tight mt-0.5", cfg.accent)}>{q.display(year)}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isFinal && (
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", cfg.accentLight, cfg.accent)}>
                          Final
                        </span>
                      )}
                      <div className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        hasData ? "bg-green-50 text-green-600" : "bg-muted text-muted-foreground"
                      )}>
                        {hasData ? "com dados reais" : "sem dados reais"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className={cn("mx-5 h-px", cfg.accentLight, "bg-border/60")} />

                {/* KRI blocks */}
                <div className="px-5 pt-4 pb-5 space-y-5">
                  <KriBlock
                    icon={Users}
                    label="Corretores CRECI"
                    target={milestone?.targetCreci ?? null}
                    actual={actual?.actualCreci ?? null}
                    targetRaw={milestone?.targetCreci ?? ""}
                    canWrite={canWrite}
                    cfg={cfg}
                    onChange={v => handleMilestoneChange(qDate, q.label, "targetCreci", v)}
                  />
                  <KriBlock
                    icon={Building2}
                    label="Representações (CREs)"
                    target={milestone?.targetCres ?? null}
                    actual={actual?.actualCres ?? null}
                    targetRaw={milestone?.targetCres ?? ""}
                    canWrite={canWrite}
                    cfg={cfg}
                    onChange={v => handleMilestoneChange(qDate, q.label, "targetCres", v)}
                  />
                  <KriBlock
                    icon={TrendingUp}
                    label="VGH (Honorários)"
                    target={milestone?.targetVgh ?? null}
                    actual={actual?.actualVgh ?? null}
                    targetRaw={milestone?.targetVgh ?? ""}
                    isVgh
                    canWrite={canWrite}
                    cfg={cfg}
                    onChange={v => handleMilestoneChange(qDate, q.label, "targetVgh", v)}
                  />
                </div>

                {/* Empty state hint */}
                {!hasTargets && canWrite && (
                  <div className={cn("mx-5 mb-4 rounded-xl px-3 py-2.5 text-center", cfg.accentLight)}>
                    <p className={cn("text-[11px] font-medium", cfg.accent)}>
                      Digite as metas nos campos acima
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/50 text-center">
        Metas salvas automaticamente · Valores reais calculados a partir dos KRIs mensais registrados
      </p>
    </div>
  );
}
