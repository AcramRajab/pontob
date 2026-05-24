import { useRoute, useLocation } from "wouter";
import { useListKeyProcesses, useListStrategicInitiatives, useCreateGoalInitiative, useUpdateGoalInitiative, getListGoalInitiativesQueryKey, useListUsers, getListKeyProcessesQueryKey, getListStrategicInitiativesQueryKey, getListUsersQueryKey, GoalInitiativeInputFrequency, getGetGoalQueryKey, useGetGoal } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight, BookOpen, Pencil, Loader2, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface InitiativeForm {
  customName: string;
  desiredResult: string;
  ownerUserId: string;
  startDate: string;
  endDate: string;
  frequency: string;
  executionDay: string;
  executionTime: string;
  estimatedTime: string;
  whatWillBeDone: string;
  whyItMatters: string;
  whoIsResponsible: string;
  whereItWillBeDone: string;
  howItWillBeDone: string;
  investmentOrEffort: string;
  actualResult: string;
}

type Mode = "choose" | "catalog-select" | "catalog-configure" | "custom-configure";

export default function NewGoalInitiative() {
  const [, params] = useRoute("/goals/:id/initiatives/new");
  const goalId = parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("choose");
  const [selectedInitiative, setSelectedInitiative] = useState<any>(null);
  const [dimensionId, setDimensionId] = useState<string>("");
  const [keyProcessId, setKeyProcessId] = useState<string>("");
  const [show5W2H, setShow5W2H] = useState(false);

  // Load the goal so we can lock filters to its dimension/key-process
  const { data: goal, isLoading: goalLoading } = useGetGoal(goalId, {
    query: { queryKey: getGetGoalQueryKey(goalId) },
  });

  // Pre-set dimension + key-process from the goal when data arrives
  useEffect(() => {
    if (!goal) return;
    if ((goal as any).dimensionId) setDimensionId(String((goal as any).dimensionId));
    if ((goal as any).keyProcessId) setKeyProcessId(String((goal as any).keyProcessId));
  }, [goal]);

  const kpParams = { dimensionId: dimensionId ? parseInt(dimensionId) : undefined };
  const { data: keyProcesses = [] } = useListKeyProcesses(
    kpParams,
    { query: { enabled: !!dimensionId, queryKey: getListKeyProcessesQueryKey(kpParams) } }
  );
  const initParams = { dimensionId: dimensionId ? parseInt(dimensionId) : undefined, keyProcessId: keyProcessId ? parseInt(keyProcessId) : undefined };
  const { data: initiatives = [] } = useListStrategicInitiatives(
    initParams,
    { query: { enabled: mode === "catalog-select" && !!dimensionId, queryKey: getListStrategicInitiativesQueryKey(initParams) } }
  );

  const goalDimensionName = (goal as any)?.dimensionName ?? "";
  const { data: users = [] } = useListUsers({}, { query: { enabled: !!user?.franchiseId, queryKey: getListUsersQueryKey({}) } });
  const franchiseUsers = users.filter((u: any) => u.franchiseId === user?.franchiseId);

  const create = useCreateGoalInitiative();
  const updateInitiative = useUpdateGoalInitiative();
  const [completingId, setCompletingId] = useState<number | null>(null);

  const goalInitiatives = (goal as any)?.initiatives ?? [];
  const activeGoalInits = goalInitiatives.filter((i: any) => i.status === "ativa");
  const isAtLimit = !goalLoading && !!goal && activeGoalInits.length >= 3;

  const handleCompleteInitiative = async (initiativeId: number) => {
    setCompletingId(initiativeId);
    try {
      await updateInitiative.mutateAsync({ id: initiativeId, data: { status: "concluida", progressPercentage: 100 } as any });
      qc.invalidateQueries({ queryKey: getGetGoalQueryKey(goalId) });
      toast({ title: "Iniciativa concluída! Um slot foi liberado." });
    } catch {
      toast({ title: "Erro ao concluir iniciativa", variant: "destructive" });
    } finally {
      setCompletingId(null);
    }
  };

  const { register, handleSubmit, control, formState: { errors } } = useForm<InitiativeForm>({
    defaultValues: { frequency: "diario" },
  });

  const onSubmit = async (data: InitiativeForm) => {
    try {
      const isCustom = mode === "custom-configure";
      await create.mutateAsync({
        id: goalId,
        data: {
          strategicInitiativeId: isCustom ? undefined : selectedInitiative?.id,
          customName: isCustom ? data.customName : undefined,
          desiredResult: data.desiredResult || undefined,
          actualResult: data.actualResult || undefined,
          ownerUserId: data.ownerUserId ? parseInt(data.ownerUserId) : undefined,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          frequency: (data.frequency || undefined) as typeof GoalInitiativeInputFrequency[keyof typeof GoalInitiativeInputFrequency] | undefined,
          executionDay: data.executionDay || undefined,
          executionTime: data.executionTime || undefined,
          estimatedTime: data.estimatedTime || undefined,
          whatWillBeDone: data.whatWillBeDone || undefined,
          whyItMatters: data.whyItMatters || undefined,
          whoIsResponsible: data.whoIsResponsible || undefined,
          whereItWillBeDone: data.whereItWillBeDone || undefined,
          howItWillBeDone: data.howItWillBeDone || undefined,
          investmentOrEffort: data.investmentOrEffort || undefined,
        } as any,
      });
      qc.invalidateQueries({ queryKey: getListGoalInitiativesQueryKey(goalId) });
      qc.invalidateQueries({ queryKey: getGetGoalQueryKey(goalId) });
      toast({ title: "Iniciativa adicionada" });
      navigate(`/goals/${goalId}`);
    } catch (err: any) {
      if (err?.status === 409) {
        toast({
          title: "Iniciativa já vinculada",
          description: "Esta iniciativa já está vinculada a esta meta.",
          variant: "destructive",
        });
      } else {
        toast({ title: err?.message || "Erro ao adicionar iniciativa", variant: "destructive" });
      }
    }
  };

  const w2hFields = [
    { field: "whatWillBeDone" as const, label: "O que será feito? (What)", placeholder: "Descreva a ação concreta" },
    { field: "whyItMatters" as const, label: "Por que é importante? (Why)", placeholder: "Qual o propósito desta iniciativa?" },
    { field: "whoIsResponsible" as const, label: "Quem é responsável? (Who)", placeholder: "Nome do responsável" },
    { field: "whereItWillBeDone" as const, label: "Onde será executado? (Where)", placeholder: "Local ou contexto de execução" },
    { field: "howItWillBeDone" as const, label: "Como será feito? (How)", placeholder: "Método de execução" },
    { field: "investmentOrEffort" as const, label: "Quanto custa / tempo envolvido? (How much)", placeholder: "Investimento, horas, recursos" },
    { field: "desiredResult" as const, label: "Resultado esperado", placeholder: "O que você quer alcançar com esta iniciativa?" },
  ];

  const ConfigureForm = ({ isCustom }: { isCustom: boolean }) => (
    <div className="max-w-xl mx-auto space-y-6 pb-64">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setMode(isCustom ? "choose" : "catalog-select")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isCustom ? "Iniciativa Personalizada" : "Configurar Iniciativa"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isCustom ? "Registre uma ação que já executa ou quer iniciar" : selectedInitiative?.name}
          </p>
        </div>
      </div>

      {!isCustom && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KRI</p>
            <p className="text-sm mt-0.5">{selectedInitiative?.kri}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">KPI</p>
            <p className="text-sm mt-0.5">{selectedInitiative?.kpi}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ── Custom: name only required ────────────────────────── */}
        {isCustom ? (
          <>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nome da Iniciativa *</Label>
                  <Input
                    placeholder="Ex: Programa de indicações de corretores, Reunião semanal de vendas..."
                    {...register("customName", { required: true })}
                    data-testid="input-custom-name"
                    autoFocus
                  />
                  {errors.customName && <p className="text-xs text-destructive">Nome é obrigatório</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-green-700 flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Resultado já obtido <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="Se já executou esta iniciativa antes, descreva o resultado obtido para benchmarking futuro..."
                    {...register("actualResult")}
                    data-testid="textarea-actual-result"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── 5W2H collapsible ─────────────────────────────── */}
            <button
              type="button"
              onClick={() => setShow5W2H(v => !v)}
              className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                5W2H — Planejamento da Execução
                <span className="text-xs font-normal">(opcional)</span>
              </span>
              {show5W2H ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {show5W2H && (
              <Card>
                <CardContent className="pt-4 space-y-4">
                  {w2hFields.map(q => (
                    <div key={q.field} className="space-y-1.5">
                      <Label className="text-xs font-medium">{q.label}</Label>
                      <Textarea rows={2} placeholder={q.placeholder} {...register(q.field)} data-testid={`textarea-${q.field}`} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* ── Catalog: full 5W2H shown ──────────────────────────── */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">5W2H — Planejamento da Execução</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {w2hFields.map(q => (
                <div key={q.field} className="space-y-1.5">
                  <Label className="text-xs font-medium">{q.label}</Label>
                  <Textarea rows={2} placeholder={q.placeholder} {...register(q.field)} data-testid={`textarea-${q.field}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Agendamento</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Início</Label>
              <Input type="date" {...register("startDate")} data-testid="input-start-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Término</Label>
              <Input type="date" {...register("endDate")} data-testid="input-end-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário de execução</Label>
              <Input type="time" {...register("executionTime")} data-testid="input-execution-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tempo estimado</Label>
              <Input placeholder="Ex: 30min" {...register("estimatedTime")} data-testid="input-estimated-time" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => setMode(isCustom ? "choose" : "catalog-select")} className="flex-1">
            Voltar
          </Button>
          <Button type="submit" className="flex-1" disabled={create.isPending} data-testid="button-submit">
            {create.isPending ? "Adicionando..." : "Adicionar Iniciativa"}
          </Button>
        </div>
      </form>
    </div>
  );

  if (isAtLimit) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/goals/${goalId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Limite atingido</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{(goal as any)?.title}</p>
          </div>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => <div key={i} className="h-3 w-3 rounded-full bg-orange-400" />)}
            </div>
            <span className="font-semibold text-orange-700 text-sm">3 de 3 slots em uso</span>
          </div>
          <p className="text-sm text-orange-700/80">Esta meta já tem 3 iniciativas ativas. Para adicionar uma nova, conclua uma das existentes abaixo.</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Como liberar um slot</p>
          {[
            "Escolha uma das iniciativas abaixo para concluir",
            'Clique em "Concluir" — o progresso vai para 100%',
            "O slot é liberado e você pode adicionar a nova iniciativa",
          ].map((text, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">{text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {activeGoalInits.map((ini: any) => (
            <div key={ini.id} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 bg-white">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{ini.initiativeName || ini.customName || "Iniciativa"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${ini.progressPercentage ?? 0}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{ini.progressPercentage ?? 0}%</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                disabled={completingId === ini.id}
                onClick={() => handleCompleteInitiative(ini.id)}
              >
                {completingId === ini.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Concluir"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/goals/${goalId}`)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Adicionar Iniciativa</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Escolha como quer registrar esta iniciativa</p>
          </div>
        </div>

        <div className="grid gap-4">
          <button
            className="text-left rounded-xl border-2 p-5 hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
            onClick={() => setMode("catalog-select")}
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/15 transition-colors">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Do Catálogo Estratégico</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha uma das 54 iniciativas já mapeadas pela RE/MAX SC com KRI, KPI e boas práticas definidas.
                </p>
              </div>
            </div>
          </button>

          <button
            className="text-left rounded-xl border-2 p-5 hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
            onClick={() => setMode("custom-configure")}
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-muted p-2.5 group-hover:bg-muted/80 transition-colors">
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Iniciativa Personalizada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Registre uma ação que já executa ou que não está no catálogo. Você pode inclusive registrar o resultado que já obteve.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "catalog-select") {
    const goalKeyProcessName = keyProcesses.find((kp: any) => String(kp.id) === keyProcessId)?.name ?? (goal as any)?.keyProcessName ?? "";
    const isShowingAll = !keyProcessId;

    return (
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode("choose")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Selecionar Iniciativa</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isShowingAll
                ? <>{goalDimensionName} — todos os processos</>
                : <>{goalDimensionName} · <span className="font-medium text-foreground">{goalKeyProcessName}</span></>
              }
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {!dimensionId && (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
          )}
          {dimensionId && initiatives.map((ini: any) => (
            <button
              key={ini.id}
              data-testid={`card-initiative-${ini.id}`}
              type="button"
              className="w-full text-left rounded-lg border px-4 py-3 hover:border-primary/40 hover:bg-primary/[0.02] transition-all flex items-center justify-between gap-3 bg-background"
              onClick={() => { setSelectedInitiative(ini); setMode("catalog-configure"); }}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{ini.name}</p>
                {isShowingAll && <p className="text-xs text-muted-foreground mt-0.5">{ini.keyProcessName}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
          {dimensionId && initiatives.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma iniciativa encontrada.</p>
          )}
        </div>

        {dimensionId && !isShowingAll && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline w-full text-center py-1"
            onClick={() => setKeyProcessId("")}
          >
            Ver todas as iniciativas de {goalDimensionName}
          </button>
        )}
        {dimensionId && isShowingAll && keyProcessId === "" && (goal as any)?.keyProcessId && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline w-full text-center py-1"
            onClick={() => setKeyProcessId(String((goal as any).keyProcessId))}
          >
            Mostrar apenas {(goal as any)?.keyProcessName}
          </button>
        )}
      </div>
    );
  }

  return <ConfigureForm isCustom={mode === "custom-configure"} />;
}
