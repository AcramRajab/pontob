import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Pencil, Check, X, Users, Building2, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
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

function formatVgh(v: number | null | undefined) {
  if (v == null) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  if (v >= 1_000) return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
  return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

function formatNum(v: number | null | undefined) {
  if (v == null) return "—";
  return Math.round(v).toLocaleString("pt-BR");
}

/** Parse Brazilian-formatted number: "808.260" → 808260, "2.688.000" → 2688000, "808260" → 808260 */
function parseBrNumber(s: string): number | null {
  if (!s || s.trim() === "") return null;
  // Detect Brazilian thousands format: if last group after dot has 3 digits, treat dots as thousands sep
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
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

function generateStatement(
  franchiseName: string,
  year: number,
  q4: { targetCreci: number | null; targetCres: number | null; targetVgh: number | null } | null
): string {
  if (!q4) return "";
  const creci = q4.targetCreci != null ? `${q4.targetCreci} corretores ativos` : null;
  const cres  = q4.targetCres  != null ? `${q4.targetCres} representações` : null;
  const vgh   = q4.targetVgh   != null ? `${formatVgh(q4.targetVgh)} em honorários` : null;

  const parts = [creci, cres, vgh].filter(Boolean);
  if (parts.length === 0) return "";

  const body = parts.length === 1
    ? parts[0]
    : parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];

  return `Em dezembro de ${year}, a ${franchiseName} terá ${body}.`;
}

/**
 * Text input for currency values (VGH).
 * - Accepts Brazilian format: "808.260" or "808260" or "2.688.000"
 * - Shows formatted value when blurred, raw digits when focused
 * - Emits the raw numeric string to onChange for saving
 */
function VghTextInput({
  storedValue,
  onChange,
  className,
  placeholder = "—",
  textAlign = "left",
}: {
  storedValue: number | null;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  textAlign?: "left" | "right";
}) {
  const [focused, setFocused] = useState(false);
  // Draft holds what the user is currently typing (raw)
  const [draft, setDraft] = useState(() =>
    storedValue != null ? String(Math.round(storedValue)) : ""
  );

  // Sync draft when storedValue changes from outside (e.g. after save)
  useEffect(() => {
    if (!focused) {
      setDraft(storedValue != null ? String(Math.round(storedValue)) : "");
    }
  }, [storedValue, focused]);

  const displayValue = focused
    ? draft
    : storedValue != null
    ? Math.round(storedValue).toLocaleString("pt-BR")
    : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      placeholder={placeholder}
      onFocus={() => {
        setFocused(true);
        setDraft(storedValue != null ? String(Math.round(storedValue)) : "");
      }}
      onChange={e => {
        const raw = e.target.value;
        setDraft(raw);
        const parsed = parseBrNumber(raw);
        onChange(parsed != null ? String(parsed) : "");
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseBrNumber(draft);
        onChange(parsed != null ? String(parsed) : "");
      }}
      className={cn(
        "bg-transparent border-0 focus:outline-none p-0 m-0 w-full tabular-nums",
        textAlign === "right" ? "text-right" : "text-left",
        className,
      )}
    />
  );
}

function KriBlock({
  icon: Icon,
  label,
  target,
  actual,
  actualRaw,
  targetRaw,
  isVgh,
  canWrite,
  onChange,
  onActualChange,
  cfg,
  isCarried,
  carriedFromQ,
}: {
  icon: any;
  label: string;
  target: number | null;
  actual: number | null;
  actualRaw: string | number;
  targetRaw: string | number;
  isVgh?: boolean;
  canWrite: boolean;
  onChange: (v: string) => void;
  onActualChange: (v: string) => void;
  cfg: (typeof Q_CONFIG)[0];
  isCarried?: boolean;
  carriedFromQ?: number;
}) {
  const p = pct(actual, target);
  const barPct = p != null ? Math.min(p, 100) : 0;
  const isGood = p != null && p >= 100;
  const hasTarget = target != null && target !== 0;
  const barColor = p == null ? cfg.bar
    : p >= 100 ? "bg-green-500"
    : p >= 75  ? "bg-amber-400"
    : p >= 50  ? "bg-orange-400"
    : "bg-red-400";
  const pctColor = p == null ? "text-muted-foreground"
    : p >= 100 ? "text-green-600"
    : p >= 75  ? "text-amber-500"
    : p >= 50  ? "text-orange-500"
    : "text-red-500";

  // Stored numeric values for VghTextInput
  const storedTarget = target;
  const storedActual = actual;

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn("h-3 w-3 shrink-0", cfg.accent)} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>

      {/* Values row — META | % | REALIZADO */}
      <div className="flex items-end gap-2 mb-2">
        {/* ── META ── */}
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 block mb-0.5">Meta</span>
          {canWrite ? (
            <div className={cn(
              "border-b-2 border-dashed focus-within:border-solid pb-0.5",
              hasTarget ? cfg.accentBorder : "border-muted-foreground/20",
              "focus-within:border-primary/60"
            )}>
              {isVgh ? (
                <>
                  <VghTextInput
                    storedValue={storedTarget}
                    onChange={onChange}
                    className={cn("text-base font-bold", cfg.accent, "placeholder:text-muted-foreground/20")}
                    placeholder="—"
                  />
                  {hasTarget && (
                    <span className="text-[9px] text-muted-foreground/50 block leading-none mt-0.5">
                      {formatVgh(target)}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    inputMode="numeric"
                    defaultValue={targetRaw === null || targetRaw === "" ? "" : String(targetRaw)}
                    placeholder="—"
                    className={cn(
                      "bg-transparent border-0 focus:outline-none p-0 m-0 w-full tabular-nums text-base font-bold",
                      cfg.accent,
                      "placeholder:text-muted-foreground/20 placeholder:font-normal",
                    )}
                    onChange={e => onChange(e.target.value)}
                  />
                  {hasTarget && (
                    <span className="text-[9px] text-muted-foreground/50 block leading-none mt-0.5">
                      {formatNum(target)}
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <span className={cn("text-base font-bold tabular-nums", hasTarget ? cfg.accent : "text-muted-foreground/30 italic text-sm")}>
              {hasTarget ? (isVgh ? formatVgh(target) : formatNum(target)) : "—"}
            </span>
          )}
        </div>

        {/* ── % ── */}
        <div className="shrink-0 flex flex-col items-center pb-0.5 w-12">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 block mb-0.5 text-center">%</span>
          {p != null ? (
            <>
              <span className={cn("text-sm font-black leading-none tabular-nums text-center", pctColor)}>
                {p > 999 ? ">999" : p}%
              </span>
              <span className="text-[8px] text-muted-foreground/40 mt-0.5 font-medium">ating.</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground/20 text-center">—</span>
          )}
        </div>

        {/* ── REALIZADO ── */}
        <div className="flex-1 min-w-0 flex flex-col items-end">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 block mb-0.5">Realizado</span>
          {canWrite ? (
            <div className={cn(
              "w-full border-b-2 pb-0.5 focus-within:border-solid",
              isCarried
                ? "border-dashed border-muted-foreground/20"
                : actual != null
                ? isGood ? "border-green-300 focus-within:border-green-400" : "border-border focus-within:border-primary/60"
                : "border-dashed border-muted-foreground/20 focus-within:border-primary/60"
            )}>
              {isVgh ? (
                <>
                  <VghTextInput
                    storedValue={storedActual}
                    onChange={onActualChange}
                    textAlign="right"
                    className={cn(
                      "text-sm font-semibold",
                      isCarried ? "text-muted-foreground/50" :
                      actual != null ? (isGood ? "text-green-600" : "text-foreground") : "text-muted-foreground/30",
                      "placeholder:text-muted-foreground/30"
                    )}
                    placeholder={isCarried && actual != null ? formatVgh(actual) : "—"}
                  />
                  {actual != null && (
                    <span className="text-[9px] text-muted-foreground/50 block leading-none mt-0.5 text-right">
                      {formatVgh(actual)}
                    </span>
                  )}
                </>
              ) : (
                <input
                  key={String(actualRaw)}
                  type="text"
                  inputMode="numeric"
                  defaultValue={actualRaw === null || actualRaw === "" ? "" : String(actualRaw)}
                  placeholder={isCarried && actual != null ? formatNum(actual) : "—"}
                  className={cn(
                    "bg-transparent border-0 focus:outline-none p-0 m-0 w-full tabular-nums text-sm font-semibold text-right",
                    isCarried
                      ? "text-muted-foreground/50 placeholder:text-muted-foreground/50"
                      : actual != null
                      ? isGood ? "text-green-600" : "text-foreground"
                      : "text-muted-foreground/30",
                    "placeholder:font-normal"
                  )}
                  onChange={e => onActualChange(e.target.value)}
                />
              )}
              {isCarried && carriedFromQ != null && (
                <div className="text-[8px] font-semibold text-muted-foreground/40 mt-0.5 uppercase tracking-wide text-right">
                  ↑ do Q{carriedFromQ}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <span className={cn("text-sm font-semibold tabular-nums", actual != null ? (isCarried ? "text-muted-foreground/50" : isGood ? "text-green-600" : "text-foreground") : "text-muted-foreground/30")}>
                {actual != null ? (isVgh ? formatVgh(actual) : formatNum(actual)) : "—"}
              </span>
              {isCarried && carriedFromQ != null && (
                <div className="text-[8px] font-semibold text-muted-foreground/40 mt-0.5 uppercase tracking-wide">
                  ↑ do Q{carriedFromQ}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", hasTarget || actual != null ? barColor : "bg-transparent")}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

export default function Visao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();
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

  const saveActual = useMutation({
    mutationFn: (body: object) =>
      apiFetch("/api/franchise-kris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast({ title: "Erro ao salvar dado real", variant: "destructive" }),
  });

  // Quarter end month: Q1=3, Q2=6, Q3=9, Q4=12
  const QUARTER_MONTH = [3, 6, 9, 12];

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

  const handleActualChange = useCallback(
    (quarterIdx: number, field: "creci" | "cres" | "vgh", raw: string) => {
      if (!franchiseId) return;
      const month = QUARTER_MONTH[quarterIdx];
      const key = `actual-${month}-${field}`;
      clearTimeout(debounceRef.current[key]);
      debounceRef.current[key] = setTimeout(() => {
        const qDate = QUARTERS[quarterIdx].date(year);
        const existing = getActual(qDate);
        const val = raw === "" ? null : parseFloat(raw);
        saveActual.mutate({
          franchiseId, year, month,
          creci: field === "creci" ? val : (existing?.actualCreci ?? null),
          cres:  field === "cres"  ? val : (existing?.actualCres  ?? null),
          vgh:   field === "vgh"   ? val : (existing?.actualVgh   ?? null),
        });
      }, 600);
    },
    [franchiseId, year, getActual, saveActual]
  );

  const franchiseName =
    (isAdmin || isSocio)
      ? ((franchises as any[]).find((f: any) => f.id === franchiseId)?.name ?? "Selecione uma franquia")
      : (user?.franchiseName ?? "Franquia");
  const hasStatement = !!data?.visao?.statement;
  const currentYear = new Date().getFullYear();

  // Derive Q4 milestone (last quarter) for auto-generation
  const q4Date = QUARTERS[3].date(year);
  const q4Milestone = data?.milestones?.find((m: any) => m.quarterDate === q4Date) ?? null;
  const q4HasTargets = !!(q4Milestone?.targetCreci != null || q4Milestone?.targetCres != null || q4Milestone?.targetVgh != null);

  function openEditWithAutoFill() {
    const current = data?.visao?.statement ?? "";
    // If no statement yet but Q4 targets exist, auto-fill suggestion
    const draft = current || (q4HasTargets ? generateStatement(franchiseName, year, q4Milestone) : "");
    setStatementDraft(draft);
    setEditingStatement(true);
  }

  function syncFromQ4() {
    if (!q4HasTargets) return;
    const generated = generateStatement(franchiseName, year, q4Milestone);
    setStatementDraft(generated);
    setEditingStatement(true);
  }

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

      {/* Franchise picker (admin / sócio com múltiplas franquias) */}
      {(isAdmin || isSocio) && (franchises as any[]).length > 1 && (
        <FranchisePicker
          franchises={franchises as any[]}
          value={isSocio ? socioFranchiseId : adminFranchiseId}
          onChange={isSocio ? setSocioFranchiseId : setAdminFranchiseId}
        />
      )}

      {!franchiseId && (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar a Visão." />
      )}

      {/* ── Vision Statement ── */}
      <div className={cn(
        "group relative rounded-2xl border transition-all duration-200",
        editingStatement
          ? "border-primary/40 shadow-lg shadow-primary/5 bg-card"
          : hasStatement
          ? "border-border bg-card hover:border-primary/30 hover:shadow-sm cursor-pointer"
          : "border-dashed border-border/60 bg-muted/20 hover:border-primary/30 cursor-pointer"
      )}
        onClick={() => !editingStatement && canWrite && openEditWithAutoFill()}
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
                    {/* Sync from Q4 button (inside edit mode) */}
                    {q4HasTargets && (
                      <Button size="sm" variant="outline" className="h-8 px-3 rounded-lg text-xs gap-1.5"
                        onClick={() => syncFromQ4()}>
                        <RefreshCw className="h-3 w-3" />
                        Usar metas do Q4
                      </Button>
                    )}
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
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {q4HasTargets && (
                      <Button variant="ghost" size="sm"
                        className="h-8 px-2.5 rounded-lg text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => syncFromQ4()}>
                        <RefreshCw className="h-3 w-3" />
                        Sincronizar com Q4
                      </Button>
                    )}
                    <Button variant="ghost" size="sm"
                      className="h-8 w-8 p-0 rounded-lg"
                      onClick={() => openEditWithAutoFill()}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
            const hasTargets = !!(milestone?.targetCreci || milestone?.targetCres || milestone?.targetVgh);

            // Carry-forward: find the most recent actual for each KRI from prior quarters
            type CarryResult = { value: number | null; fromQ: number | null };
            function carryForward(field: "actualCreci" | "actualCres" | "actualVgh"): CarryResult {
              const own = actual?.[field] ?? null;
              if (own != null) return { value: own, fromQ: null };
              for (let i = idx - 1; i >= 0; i--) {
                const prev = getActual(QUARTERS[i].date(year));
                if (prev?.[field] != null) return { value: prev[field] as number, fromQ: i + 1 };
              }
              return { value: null, fromQ: null };
            }
            const cfCreci = carryForward("actualCreci");
            const cfCres  = carryForward("actualCres");
            const cfVgh   = carryForward("actualVgh");

            // "com dados" only when this quarter has its OWN actuals (not carried from a prior quarter)
            const hasData = actual?.actualCreci != null || actual?.actualCres != null || actual?.actualVgh != null;

            // Overall % average using effective (carried) actuals vs this quarter's targets
            const pCreci = pct(cfCreci.value, milestone?.targetCreci ?? null);
            const pCres  = pct(cfCres.value,  milestone?.targetCres  ?? null);
            const pVgh   = pct(cfVgh.value,   milestone?.targetVgh   ?? null);
            const pValues = [pCreci, pCres, pVgh].filter((v): v is number => v != null);
            // Cap each KRI at 100% before averaging so a single over-performing
            // KRI doesn't inflate the composite score
            const overallPct = pValues.length > 0
              ? Math.round(pValues.reduce((a, b) => a + Math.min(b, 100), 0) / pValues.length)
              : null;
            const overallColor = overallPct == null ? ""
              : overallPct >= 100 ? "text-green-600"
              : overallPct >= 75  ? "text-amber-500"
              : overallPct >= 50  ? "text-orange-500"
              : "text-red-500";

            return (
              <div
                key={qDate}
                className={cn(
                  "rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-px",
                  isFinal ? "ring-1 " + cfg.ring : ""
                )}
              >
                {/* Card header strip */}
                <div className={cn("px-5 pt-4 pb-3", cfg.accentLight)}>
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Q badge + label */}
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0", cfg.accentBg)}>
                        {q.short}
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-muted-foreground leading-none">{q.label}</div>
                        <div className={cn("text-sm font-bold leading-tight mt-0.5", cfg.accent)}>{q.display(year)}</div>
                      </div>
                    </div>

                    {/* Right: overall % + status badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {overallPct != null && (
                        <div className="flex items-baseline gap-0.5">
                          <span className={cn("text-xl font-black tabular-nums leading-none", overallColor)}>{overallPct}%</span>
                          <span className="text-[9px] text-muted-foreground/50 font-medium ml-0.5">méd.</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {isFinal && (
                          <span className={cn("text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full", cfg.accentBg, "text-white")}>
                            Final
                          </span>
                        )}
                        <div className={cn(
                          "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                          hasData ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground/60"
                        )}>
                          {hasData ? "com dados" : "sem dados"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border/40" />

                {/* KRI blocks */}
                <div className="px-5 pt-1 pb-4">
                  <KriBlock
                    icon={Users}
                    label="Corretores CRECI"
                    target={milestone?.targetCreci ?? null}
                    actual={cfCreci.value}
                    actualRaw={actual?.actualCreci ?? ""}
                    targetRaw={milestone?.targetCreci ?? ""}
                    canWrite={canWrite}
                    cfg={cfg}
                    isCarried={cfCreci.fromQ != null}
                    carriedFromQ={cfCreci.fromQ ?? undefined}
                    onChange={v => handleMilestoneChange(qDate, q.label, "targetCreci", v)}
                    onActualChange={v => handleActualChange(idx, "creci", v)}
                  />
                  <KriBlock
                    icon={Building2}
                    label="Representações (CREs)"
                    target={milestone?.targetCres ?? null}
                    actual={cfCres.value}
                    actualRaw={actual?.actualCres ?? ""}
                    targetRaw={milestone?.targetCres ?? ""}
                    canWrite={canWrite}
                    cfg={cfg}
                    isCarried={cfCres.fromQ != null}
                    carriedFromQ={cfCres.fromQ ?? undefined}
                    onChange={v => handleMilestoneChange(qDate, q.label, "targetCres", v)}
                    onActualChange={v => handleActualChange(idx, "cres", v)}
                  />
                  <KriBlock
                    icon={TrendingUp}
                    label="VGH (Honorários)"
                    target={milestone?.targetVgh ?? null}
                    actual={cfVgh.value}
                    actualRaw={actual?.actualVgh ?? ""}
                    targetRaw={milestone?.targetVgh ?? ""}
                    isVgh
                    canWrite={canWrite}
                    cfg={cfg}
                    isCarried={cfVgh.fromQ != null}
                    carriedFromQ={cfVgh.fromQ ?? undefined}
                    onChange={v => handleMilestoneChange(qDate, q.label, "targetVgh", v)}
                    onActualChange={v => handleActualChange(idx, "vgh", v)}
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
