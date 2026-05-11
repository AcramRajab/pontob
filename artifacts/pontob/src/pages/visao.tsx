import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye, Pencil, Check, TrendingUp } from "lucide-react";

const QUARTERS = [
  { label: "1ºTRI", date: (y: number) => `${y}-03-31`, display: (y: number) => `31 MAR ${y}` },
  { label: "2ºTRI", date: (y: number) => `${y}-06-30`, display: (y: number) => `30 JUN ${y}` },
  { label: "3ºTRI", date: (y: number) => `${y}-09-30`, display: (y: number) => `30 SET ${y}` },
  { label: "4ºTRI / FINAL", date: (y: number) => `${y}-12-31`, display: (y: number) => `31 DEZ ${y}` },
];

function formatVgh(v: number | null | undefined) {
  if (v == null) return "—";
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const queryKey = ["visao", franchiseId, year];

  const { data, isLoading } = useQuery<VisaoData>({
    queryKey,
    queryFn: () => apiFetch(`/api/visao?franchiseId=${franchiseId}&year=${year}`),
    enabled: !!franchiseId,
  });

  useEffect(() => {
    if (!editingStatement && data) {
      setStatementDraft(data.visao?.statement ?? "");
    }
  }, [data, editingStatement]);

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
          franchiseId,
          year,
          quarterDate,
          quarterLabel,
          targetCreci: field === "targetCreci" ? val : (existing?.targetCreci ?? null),
          targetCres: field === "targetCres" ? val : (existing?.targetCres ?? null),
          targetVgh: field === "targetVgh" ? val : (existing?.targetVgh ?? null),
        });
      }, 600);
    },
    [franchiseId, year, getMilestone, saveMilestone]
  );

  const franchiseName = user?.franchiseName ?? "Franquia";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Visão {franchiseName} — {year}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Declaração anual de visão com marcos trimestrais de KRIs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg px-2">{year}</span>
          <Button variant="outline" size="icon" onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Vision Statement */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {editingStatement ? (
                <textarea
                  autoFocus
                  value={statementDraft}
                  onChange={e => setStatementDraft(e.target.value)}
                  className="w-full text-lg leading-relaxed font-medium italic bg-transparent border-b-2 border-primary/40 focus:outline-none focus:border-primary resize-none min-h-[80px]"
                  placeholder={`"Em dezembro de ${year} teremos X corretores ativos, com uma média de Y representações por corretor e alcançando o clube Z..."`}
                />
              ) : (
                <p className="text-lg leading-relaxed font-medium italic text-foreground/90">
                  {data?.visao?.statement
                    ? `"${data.visao.statement}"`
                    : <span className="text-muted-foreground not-italic font-normal">
                        Clique no lápis para escrever a declaração de visão da franquia para {year}...
                      </span>
                  }
                </p>
              )}
            </div>
            {canWrite && (
              <div className="flex gap-2 shrink-0">
                {editingStatement ? (
                  <Button size="sm" onClick={() => saveStatement.mutate(statementDraft)} disabled={saveStatement.isPending}>
                    <Check className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => { setStatementDraft(data?.visao?.statement ?? ""); setEditingStatement(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Milestone Table */}
      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Marcos Trimestrais de KRIs</span>
            <span className="text-xs text-muted-foreground ml-2">— metas de topo de linha por trimestre</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[160px]">DATA / KPI</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground min-w-[160px]">
                    <div>Corretores Empresários</div>
                    <div className="text-xs font-normal">(com CRECI)</div>
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground min-w-[160px]">
                    <div>Representações</div>
                    <div className="text-xs font-normal">(CREs)</div>
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground min-w-[180px]">
                    <div>VGH</div>
                    <div className="text-xs font-normal">(Valor Geral de Honorários)</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {QUARTERS.map((q, idx) => {
                  const qDate = q.date(year);
                  const milestone = getMilestone(qDate);
                  const actual = getActual(qDate);
                  const isFinal = idx === 3;

                  const pCreci = pct(actual?.actualCreci, milestone?.targetCreci);
                  const pCres = pct(actual?.actualCres, milestone?.targetCres);
                  const pVgh = pct(actual?.actualVgh, milestone?.targetVgh);

                  return (
                    <tr key={qDate} className={`border-b last:border-0 ${isFinal ? "bg-primary/5" : idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3">
                        <div className={`font-bold text-sm ${isFinal ? "text-primary" : "text-foreground"}`}>
                          {q.display(year)}
                        </div>
                        <Badge variant={isFinal ? "default" : "secondary"} className="mt-1 text-xs">
                          {q.label}
                        </Badge>
                      </td>

                      {/* CRECI */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {canWrite ? (
                            <Input
                              type="number"
                              min={0}
                              defaultValue={milestone?.targetCreci ?? ""}
                              key={`${qDate}-creci-${year}`}
                              placeholder="Meta"
                              className="w-20 h-8 text-center text-sm font-semibold"
                              onChange={e => handleMilestoneChange(qDate, q.label, "targetCreci", e.target.value)}
                            />
                          ) : (
                            <span className="font-semibold">{milestone?.targetCreci ?? "—"}</span>
                          )}
                          {actual?.actualCreci != null && (
                            <div className="flex items-center gap-1 text-xs">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Atual: </span>
                              <span className={`font-medium ${pCreci != null && pCreci >= 100 ? "text-green-600" : "text-orange-500"}`}>
                                {actual.actualCreci}
                                {pCreci != null && <span className="ml-1 text-xs">({pCreci}%)</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* CREs */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {canWrite ? (
                            <Input
                              type="number"
                              min={0}
                              defaultValue={milestone?.targetCres ?? ""}
                              key={`${qDate}-cres-${year}`}
                              placeholder="Meta"
                              className="w-20 h-8 text-center text-sm font-semibold"
                              onChange={e => handleMilestoneChange(qDate, q.label, "targetCres", e.target.value)}
                            />
                          ) : (
                            <span className="font-semibold">{milestone?.targetCres ?? "—"}</span>
                          )}
                          {actual?.actualCres != null && (
                            <div className="flex items-center gap-1 text-xs">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Atual: </span>
                              <span className={`font-medium ${pCres != null && pCres >= 100 ? "text-green-600" : "text-orange-500"}`}>
                                {actual.actualCres}
                                {pCres != null && <span className="ml-1 text-xs">({pCres}%)</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* VGH */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {canWrite ? (
                            <Input
                              type="number"
                              min={0}
                              step={1000}
                              defaultValue={milestone?.targetVgh ?? ""}
                              key={`${qDate}-vgh-${year}`}
                              placeholder="Meta R$"
                              className="w-36 h-8 text-center text-sm font-semibold"
                              onChange={e => handleMilestoneChange(qDate, q.label, "targetVgh", e.target.value)}
                            />
                          ) : (
                            <span className="font-semibold">{formatVgh(milestone?.targetVgh)}</span>
                          )}
                          {actual?.actualVgh != null && (
                            <div className="flex items-center gap-1 text-xs">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Atual: </span>
                              <span className={`font-medium ${pVgh != null && pVgh >= 100 ? "text-green-600" : "text-orange-500"}`}>
                                {formatVgh(actual.actualVgh)}
                                {pVgh != null && <span className="ml-1 text-xs">({pVgh}%)</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center italic">
        Metas e visão ficam salvas automaticamente. Valores reais são preenchidos a partir dos KRIs mensais registrados.
      </p>
    </div>
  );
}
