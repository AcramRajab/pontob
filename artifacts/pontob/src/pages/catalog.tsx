import { useListDimensions, useListKeyProcesses, useListStrategicInitiatives, getListKeyProcessesQueryKey, getListStrategicInitiativesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { BookOpen, ClipboardList, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PLANNER_KPI_TEMPLATES, PLANNER_SECTIONS, templatesBySection } from "@/lib/kpi-templates";

export default function Catalog() {
  const [dimensionId, setDimensionId] = useState<string>("");
  const [keyProcessId, setKeyProcessId] = useState<string>("");

  const { data: dimensions = [], isLoading: dimsLoading } = useListDimensions();
  const kpParams = { dimensionId: dimensionId ? parseInt(dimensionId) : undefined };
  const { data: keyProcesses = [], isLoading: kpsLoading } = useListKeyProcesses(
    kpParams,
    { query: { enabled: true, queryKey: getListKeyProcessesQueryKey(kpParams) } }
  );
  const initParams = {
    dimensionId: dimensionId ? parseInt(dimensionId) : undefined,
    keyProcessId: keyProcessId ? parseInt(keyProcessId) : undefined,
  };
  const { data: initiatives = [], isLoading: initsLoading } = useListStrategicInitiatives(
    initParams,
    { query: { enabled: true, queryKey: getListStrategicInitiativesQueryKey(initParams) } }
  );

  const isLoading = dimsLoading || initsLoading;

  const dimensionColor = (name: string) =>
    name === "Pessoas" ? "bg-primary/10 text-primary border-primary/30" : "bg-destructive/10 text-destructive border-destructive/30";

  function DirectionIcon({ dir }: { dir: string }) {
    if (dir === "diminuir") return <TrendingDown className="h-3 w-3 text-red-500" />;
    if (dir === "manter") return <Minus className="h-3 w-3 text-amber-500" />;
    return <TrendingUp className="h-3 w-3 text-green-500" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo de Iniciativas</h1>
        <p className="text-muted-foreground mt-1">Iniciativas estratégicas e KPIs do planner semanal</p>
      </div>

      <Tabs defaultValue="initiatives">
        <TabsList>
          <TabsTrigger value="initiatives" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Iniciativas Estratégicas
          </TabsTrigger>
          <TabsTrigger value="planner" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            KPIs do Planner Semanal
          </TabsTrigger>
        </TabsList>

        {/* ── Strategic Initiatives Tab ── */}
        <TabsContent value="initiatives" className="mt-6 space-y-5">
          <div className="flex gap-3 flex-wrap">
            <Select
              value={dimensionId || "all"}
              onValueChange={v => { setDimensionId(v === "all" ? "" : v); setKeyProcessId(""); }}
            >
              <SelectTrigger className="w-44" data-testid="select-dimension">
                <SelectValue placeholder="Dimensão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dimensões</SelectItem>
                {dimensions.map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={keyProcessId || "all"}
              onValueChange={v => setKeyProcessId(v === "all" ? "" : v)}
              disabled={!dimensionId}
            >
              <SelectTrigger className="w-56" data-testid="select-key-process">
                <SelectValue placeholder="Processo-chave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os processos</SelectItem>
                {keyProcesses.map((kp: any) => (
                  <SelectItem key={kp.id} value={String(kp.id)}>{kp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
            </div>
          ) : initiatives.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma iniciativa encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {initiatives.map((init: any) => (
                <Card key={init.id} data-testid={`card-initiative-${init.id}`} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm leading-snug">{init.name}</CardTitle>
                      <Badge variant="outline" className={`text-xs shrink-0 ${dimensionColor(init.dimensionName || "")}`}>
                        {init.dimensionName}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{init.keyProcessName}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2.5">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KRI</span>
                      <p className="text-xs mt-0.5 leading-relaxed">{init.kri}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KPI</span>
                      <p className="text-xs mt-0.5 leading-relaxed">{init.kpi}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Planner KPIs Tab ── */}
        <TabsContent value="planner" className="mt-6 space-y-5">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Estes são os KPIs padronizados do <strong>Planner Semanal RE/MAX SC</strong>. Ao adicionar KPIs a uma meta, você pode usá-los como sugestão com um clique.
          </div>

          <div className="space-y-4">
            {PLANNER_SECTIONS.map(sec => {
              const templates = templatesBySection(sec.key);
              return (
                <Card key={sec.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm ${sec.color}`}>{sec.key}</CardTitle>
                    <CardDescription className="text-xs">{templates.length} indicadores rastreados semanalmente</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="divide-y">
                      {templates.map(t => (
                        <div key={t.name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <DirectionIcon dir={t.desiredDirection} />
                            <span className="text-sm">{t.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${sec.bg} ${sec.color} ${sec.border}`}>
                              {t.unit}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {t.frequency}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                t.desiredDirection === "aumentar" ? "bg-green-50 text-green-700 border-green-200" :
                                t.desiredDirection === "diminuir" ? "bg-red-50 text-red-600 border-red-200" :
                                "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {t.desiredDirection === "aumentar" ? "↑ aumentar" : t.desiredDirection === "diminuir" ? "↓ diminuir" : "→ manter"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-dashed">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground text-center">
                Total: <strong className="text-foreground">{PLANNER_KPI_TEMPLATES.length} KPIs</strong> rastreados semanalmente por franquia — Recrutamento, Operação e Vendas
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
