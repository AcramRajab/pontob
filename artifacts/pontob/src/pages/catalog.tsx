import {
  useListDimensions,
  useListKeyProcesses,
  useListStrategicInitiatives,
  useToggleDimensionActive,
  useToggleKeyProcessActive,
  useToggleStrategicInitiativeActive,
  getDimensionDeactivationImpact,
  getKeyProcessDeactivationImpact,
  getListDimensionsQueryKey,
  getListKeyProcessesQueryKey,
  getListStrategicInitiativesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { BookOpen, ClipboardList, TrendingUp, TrendingDown, Minus, Settings, Eye, EyeOff } from "lucide-react";
import { PLANNER_KPI_TEMPLATES, PLANNER_SECTIONS, templatesBySection } from "@/lib/kpi-templates";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

type PendingDeactivation = {
  type: "dimension" | "keyProcess";
  id: number;
  name: string;
  activeGoalCount: number;
};

export default function Catalog() {
  const [dimensionId, setDimensionId] = useState<string>("");
  const [keyProcessId, setKeyProcessId] = useState<string>("");
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [pendingDeactivation, setPendingDeactivation] = useState<PendingDeactivation | null>(null);
  const [impactCheckingId, setImpactCheckingId] = useState<string | null>(null);

  const isAdmin = !authLoading && (user?.role === "master_admin" || user?.role === "staff_regional");

  const { data: dimensions = [], isLoading: dimsLoading } = useListDimensions(
    {},
    { query: { queryKey: getListDimensionsQueryKey({}) } }
  );
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

  const adminDimsParams = { includeInactive: true };
  const { data: adminDimensions = [], isLoading: adminDimsLoading } = useListDimensions(
    adminDimsParams,
    { query: { enabled: isAdmin, queryKey: getListDimensionsQueryKey(adminDimsParams) } }
  );
  const adminKpParams = { includeInactive: true };
  const { data: adminKeyProcesses = [], isLoading: adminKpsLoading } = useListKeyProcesses(
    adminKpParams,
    { query: { enabled: isAdmin, queryKey: getListKeyProcessesQueryKey(adminKpParams) } }
  );
  const adminInitParams = { includeInactive: true };
  const { data: adminInitiatives = [], isLoading: adminInitsLoading } = useListStrategicInitiatives(
    adminInitParams,
    { query: { enabled: isAdmin, queryKey: getListStrategicInitiativesQueryKey(adminInitParams) } }
  );

  const toggleDim = useToggleDimensionActive({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/dimensions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/key-processes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/strategic-initiatives"] });
      },
    },
  });

  const toggleKp = useToggleKeyProcessActive({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/key-processes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/strategic-initiatives"] });
      },
    },
  });

  const toggleInit = useToggleStrategicInitiativeActive({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/strategic-initiatives"] });
      },
    },
  });

  async function handleDimensionDeactivate(d: any) {
    const key = `dim-${d.id}`;
    setImpactCheckingId(key);
    try {
      const impact = await getDimensionDeactivationImpact(d.id);
      if (impact.activeGoalCount > 0) {
        setPendingDeactivation({ type: "dimension", id: d.id, name: d.name, activeGoalCount: impact.activeGoalCount });
      } else {
        toggleDim.mutate({ id: d.id });
      }
    } finally {
      setImpactCheckingId(null);
    }
  }

  async function handleKeyProcessDeactivate(kp: any) {
    const key = `kp-${kp.id}`;
    setImpactCheckingId(key);
    try {
      const impact = await getKeyProcessDeactivationImpact(kp.id);
      if (impact.activeGoalCount > 0) {
        setPendingDeactivation({ type: "keyProcess", id: kp.id, name: kp.name, activeGoalCount: impact.activeGoalCount });
      } else {
        toggleKp.mutate({ id: kp.id });
      }
    } finally {
      setImpactCheckingId(null);
    }
  }

  function confirmDeactivation() {
    if (!pendingDeactivation) return;
    if (pendingDeactivation.type === "dimension") {
      toggleDim.mutate({ id: pendingDeactivation.id });
    } else {
      toggleKp.mutate({ id: pendingDeactivation.id });
    }
    setPendingDeactivation(null);
  }

  const isLoading = dimsLoading || initsLoading;
  const adminIsLoading = adminDimsLoading || adminKpsLoading || adminInitsLoading;

  const dimensionColor = (name: string) =>
    name === "Pessoas" ? "bg-primary/10 text-primary border-primary/30" : "bg-destructive/10 text-destructive border-destructive/30";

  function DirectionIcon({ dir }: { dir: string }) {
    if (dir === "diminuir") return <TrendingDown className="h-3 w-3 text-red-500" />;
    if (dir === "manter") return <Minus className="h-3 w-3 text-amber-500" />;
    return <TrendingUp className="h-3 w-3 text-green-500" />;
  }

  function InactiveLabel() {
    return (
      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-muted-foreground/30">
        Inativo
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo de Iniciativas</h1>
        <p className="text-muted-foreground mt-1">Iniciativas estratégicas e KPIs do planner semanal</p>
      </div>

      <AlertDialog open={!!pendingDeactivation} onOpenChange={open => { if (!open) setPendingDeactivation(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar "{pendingDeactivation?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeactivation && (
                <>
                  Há <strong>{pendingDeactivation.activeGoalCount}</strong>{" "}
                  {pendingDeactivation.activeGoalCount === 1 ? "meta ativa que referencia" : "metas ativas que referenciam"} este item.
                  Desativá-lo pode causar confusão para as franquias afetadas.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desativar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          {isAdmin && (
            <TabsTrigger value="management" className="gap-2">
              <Settings className="h-4 w-4" />
              Gestão do Catálogo
            </TabsTrigger>
          )}
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

        {/* ── Catalog Management Tab (admin only) ── */}
        {isAdmin && (
          <TabsContent value="management" className="mt-6 space-y-8">
            <div className="rounded-lg border bg-amber-50 border-amber-200 p-4 text-sm text-amber-800">
              Aqui você pode ver todos os itens do catálogo, incluindo os inativos, e reativar qualquer item desativado por engano.
            </div>

            {adminIsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : (
              <>
                {/* Dimensions */}
                <section>
                  <h2 className="text-base font-semibold mb-3">Dimensões</h2>
                  <div className="rounded-lg border divide-y overflow-hidden">
                    {adminDimensions.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">Nenhuma dimensão encontrada.</p>
                    ) : adminDimensions.map((d: any) => (
                      <div
                        key={d.id}
                        data-testid={`mgmt-dimension-${d.id}`}
                        className={`flex items-center justify-between px-4 py-3 gap-3 ${!d.active ? "bg-muted/40" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-sm font-medium truncate ${!d.active ? "line-through text-muted-foreground" : ""}`}>
                            {d.name}
                          </span>
                          {!d.active && <InactiveLabel />}
                        </div>
                        <Button
                          size="sm"
                          variant={d.active ? "outline" : "default"}
                          className="shrink-0 gap-1.5"
                          disabled={toggleDim.isPending || impactCheckingId === `dim-${d.id}`}
                          onClick={() => d.active ? handleDimensionDeactivate(d) : toggleDim.mutate({ id: d.id })}
                          data-testid={`toggle-dimension-${d.id}`}
                        >
                          {d.active ? (
                            <><EyeOff className="h-3.5 w-3.5" /> Desativar</>
                          ) : (
                            <><Eye className="h-3.5 w-3.5" /> Reativar</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Key Processes */}
                <section>
                  <h2 className="text-base font-semibold mb-3">Processos-chave</h2>
                  <div className="rounded-lg border divide-y overflow-hidden">
                    {adminKeyProcesses.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">Nenhum processo encontrado.</p>
                    ) : adminKeyProcesses.map((kp: any) => (
                      <div
                        key={kp.id}
                        data-testid={`mgmt-key-process-${kp.id}`}
                        className={`flex items-center justify-between px-4 py-3 gap-3 ${!kp.active ? "bg-muted/40" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="min-w-0">
                            <span className={`text-sm font-medium block truncate ${!kp.active ? "line-through text-muted-foreground" : ""}`}>
                              {kp.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{kp.dimensionName}</span>
                          </div>
                          {!kp.active && <InactiveLabel />}
                        </div>
                        <Button
                          size="sm"
                          variant={kp.active ? "outline" : "default"}
                          className="shrink-0 gap-1.5"
                          disabled={toggleKp.isPending || impactCheckingId === `kp-${kp.id}`}
                          onClick={() => kp.active ? handleKeyProcessDeactivate(kp) : toggleKp.mutate({ id: kp.id })}
                          data-testid={`toggle-key-process-${kp.id}`}
                        >
                          {kp.active ? (
                            <><EyeOff className="h-3.5 w-3.5" /> Desativar</>
                          ) : (
                            <><Eye className="h-3.5 w-3.5" /> Reativar</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Strategic Initiatives */}
                <section>
                  <h2 className="text-base font-semibold mb-3">Iniciativas Estratégicas</h2>
                  <div className="rounded-lg border divide-y overflow-hidden">
                    {adminInitiatives.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">Nenhuma iniciativa encontrada.</p>
                    ) : adminInitiatives.map((init: any) => (
                      <div
                        key={init.id}
                        data-testid={`mgmt-initiative-${init.id}`}
                        className={`flex items-center justify-between px-4 py-3 gap-3 ${!init.active ? "bg-muted/40" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="min-w-0 flex-1">
                            <span className={`text-sm font-medium block ${!init.active ? "line-through text-muted-foreground" : ""}`}>
                              {init.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {init.dimensionName} › {init.keyProcessName}
                            </span>
                          </div>
                          {!init.active && <InactiveLabel />}
                        </div>
                        <Button
                          size="sm"
                          variant={init.active ? "outline" : "default"}
                          className="shrink-0 gap-1.5"
                          disabled={toggleInit.isPending}
                          onClick={() => toggleInit.mutate({ id: init.id })}
                          data-testid={`toggle-initiative-${init.id}`}
                        >
                          {init.active ? (
                            <><EyeOff className="h-3.5 w-3.5" /> Desativar</>
                          ) : (
                            <><Eye className="h-3.5 w-3.5" /> Reativar</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
