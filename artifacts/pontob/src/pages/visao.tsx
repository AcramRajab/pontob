import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Pencil, Check, X, Target, Users, Building2, TrendingUp } from "lucide-react";
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
  { label: "1º Trimestre", short: "Q1", date: (y: number) => `${y}-03-31`, display: (y: number) => `Mar ${y}` },
  { label: "2º Trimestre", short: "Q2", date: (y: number) => `${y}-06-30`, display: (y: number) => `Jun ${y}` },
  { label: "3º Trimestre", short: "Q3", date: (y: number) => `${y}-09-30`, display: (y: number) => `Set ${y}` },
  { label: "4º Trimestre", short: "Q4", date: (y: number) => `${y}-12-31`, display: (y: number) => `Dez ${y}` },
];

const Q_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-600", text: "text-blue-700", bar: "bg-blue-500" },
  { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-600", text: "text-violet-700", bar: "bg-violet-500" },
  { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-500", text: "text-amber-700", bar: "bg-amber-400" },
  { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-600", text: "text-emerald-700", bar: "bg-emerald-500" },
];

function formatVgh(v: number | null | undefined) {
  if (v == null) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
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

function KriRow({
  icon: Icon,
  label,
  target,
  actual,
  targetRaw,
  isVgh,
  canWrite,
  onChange,
  colorBar,
}: {
  icon: any;
  label: string;
  target: number | null;
  actual: number | null;
  targetRaw: string | number;
  isVgh?: boolean;
  canWrite: boolean;
  onChange: (v: string) => void;
  colorBar: string;
}) {
  const p = pct(actual, target);
  const capped = p != null ? Math.min(p, 100) : 0;
  const isGood = p != null && p >= 100;
  const hasActual = actual != null;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
        {hasActual && target && (
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", isGood ? "bg-green-500" : p! >= 60 ? "bg-amber-400" : colorBar)}
              style={{ width: `${capped}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasActual && (
          <div className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", isGood ? "text-green-600 bg-green-50" : "text-orange-500 bg-orange-50")}>
            {isVgh ? formatVgh(actual) : actual}
            {p != null && <span className="ml-1 opacity-70">{p}%</span>}
          </div>
        )}
        {canWrite ? (
          <Input
            type="number"
            min={0}
            step={isVgh ? 1000 : 1}
            defaultValue={targetRaw === null ? "" : targetRaw}
            placeholder={isVgh ? "R$ meta" : "Meta"}
            className={cn("text-center text-sm font-semibold h-8 border-dashed focus:border-solid", isVgh ? "w-28" : "w-20")}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <div className="text-sm font-semibold w-20 text-center">{isVgh ? formatVgh(target) : (target ?? "—")}</div>
        )}
      </div>
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
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Visão Anual — {franchiseName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Declare onde quer chegar e defina marcos trimestrais para medir o caminho
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={cn("font-bold text-lg px-4 min-w-[72px] text-center", year === currentYear ? "text-primary" : "text-foreground")}>
            {year}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Vision Statement */}
      <div className={cn(
        "relative rounded-xl border-2 transition-all overflow-hidden",
        editingStatement ? "border-primary/50 shadow-md" : hasStatement ? "border-border bg-gradient-to-br from-primary/5 via-background to-background" : "border-dashed border-border bg-muted/20"
      )}>
        <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-xl" />
        <div className="px-6 py-5 pl-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {editingStatement ? (
                <textarea
                  ref={textareaRef}
                  value={statementDraft}
                  onChange={e => setStatementDraft(e.target.value)}
                  rows={3}
                  className="w-full text-base leading-relaxed italic bg-transparent border-0 focus:outline-none resize-none placeholder:text-muted-foreground/60 placeholder:not-italic"
                  placeholder={`Em dezembro de ${year}, a ${franchiseName} terá X corretores com CRECI, Y representações ativas e alcançará R$ Z em honorários...`}
                />
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Declaração de Visão {year}</p>
                  {hasStatement ? (
                    <p className="text-base leading-relaxed italic text-foreground/90">
                      "{data?.visao?.statement}"
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {canWrite
                        ? `Clique em Editar para escrever a declaração de visão da sua franquia para ${year}.`
                        : `Nenhuma declaração de visão registrada para ${year}.`}
                    </p>
                  )}
                </div>
              )}
            </div>
            {canWrite && (
              <div className="flex gap-2 shrink-0 pt-1">
                {editingStatement ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingStatement(false); setStatementDraft(data?.visao?.statement ?? ""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => saveStatement.mutate(statementDraft)} disabled={saveStatement.isPending}>
                      <Check className="h-4 w-4 mr-1.5" />
                      Salvar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => { setStatementDraft(data?.visao?.statement ?? ""); setEditingStatement(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    {hasStatement ? "Editar" : "Escrever visão"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quarter Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium text-foreground">Marcos Trimestrais de KRIs</span>
            <span className="hidden sm:inline">— defina as metas de topo de linha por trimestre</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {QUARTERS.map((q, idx) => {
              const qDate = q.date(year);
              const milestone = getMilestone(qDate);
              const actual = getActual(qDate);
              const color = Q_COLORS[idx];
              const isFinal = idx === 3;

              const anyTarget = milestone?.targetCreci || milestone?.targetCres || milestone?.targetVgh;

              return (
                <div
                  key={qDate}
                  className={cn(
                    "rounded-xl border-2 overflow-hidden transition-shadow hover:shadow-md",
                    color.border,
                    isFinal ? color.bg : "bg-card"
                  )}
                >
                  {/* Card header */}
                  <div className={cn("px-4 py-3 flex items-center justify-between", color.bg)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md text-white", color.badge)}>
                          {q.short}
                        </span>
                        {isFinal && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            Final
                          </span>
                        )}
                      </div>
                      <div className={cn("text-xs font-medium mt-1", color.text)}>{q.display(year)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{q.label}</div>
                      {anyTarget && (
                        <div className="text-xs font-medium text-muted-foreground mt-0.5">
                          {actual?.actualCreci != null ? "com dados reais" : "sem dados reais"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KRI rows */}
                  <div className="px-4 pb-2 pt-1">
                    <KriRow
                      icon={Users}
                      label="Corretores CRECI"
                      target={milestone?.targetCreci ?? null}
                      actual={actual?.actualCreci ?? null}
                      targetRaw={milestone?.targetCreci ?? ""}
                      canWrite={canWrite}
                      colorBar={color.bar}
                      onChange={v => handleMilestoneChange(qDate, q.label, "targetCreci", v)}
                    />
                    <KriRow
                      icon={Building2}
                      label="Representações (CREs)"
                      target={milestone?.targetCres ?? null}
                      actual={actual?.actualCres ?? null}
                      targetRaw={milestone?.targetCres ?? ""}
                      canWrite={canWrite}
                      colorBar={color.bar}
                      onChange={v => handleMilestoneChange(qDate, q.label, "targetCres", v)}
                    />
                    <KriRow
                      icon={TrendingUp}
                      label="VGH (Honorários)"
                      target={milestone?.targetVgh ?? null}
                      actual={actual?.actualVgh ?? null}
                      targetRaw={milestone?.targetVgh ?? ""}
                      isVgh
                      canWrite={canWrite}
                      colorBar={color.bar}
                      onChange={v => handleMilestoneChange(qDate, q.label, "targetVgh", v)}
                    />
                  </div>

                  {!anyTarget && canWrite && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground/60 italic text-center">
                        Preencha as metas acima
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground text-center italic pt-2">
        Metas salvas automaticamente · Valores reais calculados a partir dos KRIs mensais registrados
      </p>
    </div>
  );
}
