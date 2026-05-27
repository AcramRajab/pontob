import {
  useListProgressHistory, getListProgressHistoryQueryKey,
  useListDailyCheckins, getListDailyCheckinsQueryKey,
  useListWeeklyCheckins, getListWeeklyCheckinsQueryKey,
  useListMonthlyCheckins, getListMonthlyCheckinsQueryKey,
  useUpdateDailyCheckin, useUpdateWeeklyCheckin, useUpdateMonthlyCheckin,
  WeeklyCheckinInputInitiativeDecision,
  useGetCheckinComparison, getGetCheckinComparisonQueryKey,
  CheckinComparison,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  History, TrendingUp, TrendingDown, CheckSquare, Calendar, BarChart2,
  CheckCircle2, MinusCircle, XCircle, AlertCircle, ChevronRight, Clock, HelpingHand, Pencil, Filter,
  LayoutList, TableProperties,
} from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useState, useMemo } from "react";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateOnly(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const executionLabel: Record<string, string> = {
  sim: "Executou",
  parcialmente: "Parcialmente",
  nao: "Não executou",
};

const executionColor: Record<string, string> = {
  sim: "bg-green-50 text-green-700 border-green-200",
  parcialmente: "bg-yellow-50 text-yellow-700 border-yellow-200",
  nao: "bg-red-50 text-red-600 border-red-200",
};

function ExecutionIcon({ v }: { v: string }) {
  if (v === "sim") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (v === "parcialmente") return <MinusCircle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

interface DailyEditForm {
  executedToday: "sim" | "parcialmente" | "nao";
  progressToday: number;
  blocker: string;
  nextStep: string;
  timeSpent: string;
  needsHelp: boolean;
  notes: string;
}

function DailyDetailSheet({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const update = useUpdateDailyCheckin();

  const { register, handleSubmit, control, watch } = useForm<DailyEditForm>({
    defaultValues: {
      executedToday: item.executedToday ?? "sim",
      progressToday: item.progressToday ?? 0,
      blocker: item.blocker ?? "",
      nextStep: item.nextStep ?? "",
      timeSpent: item.timeSpent ?? "",
      needsHelp: item.needsHelp ?? false,
      notes: item.notes ?? "",
    },
  });

  const executedToday = watch("executedToday");

  const onSubmit = async (data: DailyEditForm) => {
    try {
      await update.mutateAsync({
        id: item.id,
        data: {
          executedToday: data.executedToday,
          progressToday: data.progressToday,
          blocker: data.blocker || undefined,
          nextStep: data.nextStep || undefined,
          timeSpent: data.timeSpent || undefined,
          needsHelp: data.needsHelp,
          notes: data.notes || undefined,
        },
      });
      const dailyPatch = {
        executedToday: data.executedToday,
        progressToday: data.progressToday,
        blocker: data.blocker || undefined,
        nextStep: data.nextStep || undefined,
        timeSpent: data.timeSpent || undefined,
        needsHelp: data.needsHelp,
        notes: data.notes || undefined,
      };
      qc.setQueriesData<any[]>({ queryKey: ["/api/daily-checkins"] }, old =>
        old?.map(c => c.id === item.id ? { ...c, ...dailyPatch } : c)
      );
      qc.invalidateQueries({ queryKey: ["/api/daily-checkins"] });
      toast({ title: "Check-in atualizado", description: "Suas alterações foram salvas." });
      setIsEditing(false);
      onClose();
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { setIsEditing(false); onClose(); } }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Check-in Diário
          </SheetTitle>
        </SheetHeader>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 shrink-0" />
                <span>Editando check-in</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-amber-800 hover:bg-amber-100 h-auto py-0.5 px-2"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
            </div>

            {item.goalTitle && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Meta</p>
                <p className="text-sm font-medium">{item.goalTitle}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Data</p>
              <p className="text-sm">{item.date ? formatDateOnly(item.date) : formatDate(item.createdAt)}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Executou hoje?</Label>
              <Controller
                name="executedToday"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {(["sim", "parcialmente", "nao"] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => field.onChange(v)}
                        className={`flex-1 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                          field.value === v
                            ? v === "sim" ? "bg-green-600 text-white border-green-600"
                              : v === "parcialmente" ? "bg-yellow-500 text-white border-yellow-500"
                              : "bg-destructive text-white border-destructive"
                            : "bg-background border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {v === "sim" ? "Sim" : v === "parcialmente" ? "Parcialmente" : "Não"}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Progresso de hoje (%)</Label>
              <Controller
                name="progressToday"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Slider
                      min={0} max={100} step={5}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                    />
                    <div className="text-right text-sm font-mono font-medium">{field.value}%</div>
                  </div>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-blocker">Bloqueio ou dificuldade</Label>
              <Textarea id="edit-blocker" {...register("blocker")} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-nextStep">Próximo passo</Label>
              <Textarea id="edit-nextStep" {...register("nextStep")} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-timeSpent">Tempo dedicado</Label>
              <input
                id="edit-timeSpent"
                type="text"
                placeholder="Ex: 1h30"
                {...register("timeSpent")}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea id="edit-notes" {...register("notes")} rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Controller
                name="needsHelp"
                control={control}
                render={({ field }) => (
                  <Checkbox id="edit-needsHelp" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="edit-needsHelp" className="cursor-pointer">Preciso de apoio da regional</Label>
            </div>

            <Button type="submit" className="w-full" disabled={update.isPending}>
              {update.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            {item.goalTitle && <DetailRow label="Meta" value={<span className="font-medium">{item.goalTitle}</span>} />}
            <DetailRow label="Data" value={item.date ? formatDateOnly(item.date) : formatDate(item.createdAt)} />
            {item.executedToday && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Executou hoje?</p>
                <div className="flex items-center gap-2">
                  <ExecutionIcon v={item.executedToday} />
                  <Badge variant="outline" className={executionColor[item.executedToday] ?? ""}>
                    {executionLabel[item.executedToday] ?? item.executedToday}
                  </Badge>
                </div>
              </div>
            )}
            {item.progressToday != null && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Progresso de hoje</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progressToday}%` }} />
                  </div>
                  <span className="text-sm font-mono font-medium w-10 text-right">{item.progressToday}%</span>
                </div>
              </div>
            )}
            <DetailRow label="Bloqueio ou dificuldade" value={item.blocker} />
            <DetailRow label="Próximo passo" value={item.nextStep} />
            {item.timeSpent && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Tempo dedicado</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{item.timeSpent}</span>
                </div>
              </div>
            )}
            {item.needsHelp && (
              <div className="flex items-center gap-1.5 text-sm text-amber-700 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <HelpingHand className="h-4 w-4 shrink-0" />
                <span>Solicitou apoio da regional</span>
              </div>
            )}
            <DetailRow label="Notas" value={item.notes} />
            {item.userName && <DetailRow label="Registrado por" value={item.userName} />}
            <DetailRow label="Criado em" value={formatDate(item.createdAt)} />

            <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar check-in
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface WeeklyEditForm {
  planned: string;
  executed: string;
  progressSummary: string;
  blockers: string;
  adjustments: string;
  nextWeekPriority: string;
  initiativeDecision: string;
  needsRegionalSupport: boolean;
}

function WeeklyDetailSheet({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const update = useUpdateWeeklyCheckin();

  const { register, handleSubmit, control } = useForm<WeeklyEditForm>({
    defaultValues: {
      planned: item.planned ?? "",
      executed: item.executed ?? "",
      progressSummary: item.progressSummary ?? "",
      blockers: item.blockers ?? "",
      adjustments: item.adjustments ?? "",
      nextWeekPriority: item.nextWeekPriority ?? "",
      initiativeDecision: item.initiativeDecision ?? "",
      needsRegionalSupport: item.needsRegionalSupport ?? false,
    },
  });

  const onSubmit = async (data: WeeklyEditForm) => {
    try {
      await update.mutateAsync({
        id: item.id,
        data: {
          planned: data.planned || undefined,
          executed: data.executed || undefined,
          progressSummary: data.progressSummary || undefined,
          blockers: data.blockers || undefined,
          adjustments: data.adjustments || undefined,
          nextWeekPriority: data.nextWeekPriority || undefined,
          initiativeDecision: (data.initiativeDecision || undefined) as typeof WeeklyCheckinInputInitiativeDecision[keyof typeof WeeklyCheckinInputInitiativeDecision] | undefined,
          needsRegionalSupport: data.needsRegionalSupport,
        },
      });
      const weeklyPatch = {
        planned: data.planned || undefined,
        executed: data.executed || undefined,
        progressSummary: data.progressSummary || undefined,
        blockers: data.blockers || undefined,
        adjustments: data.adjustments || undefined,
        nextWeekPriority: data.nextWeekPriority || undefined,
        initiativeDecision: data.initiativeDecision || undefined,
        needsRegionalSupport: data.needsRegionalSupport,
      };
      qc.setQueriesData<any[]>({ queryKey: ["/api/weekly-checkins"] }, old =>
        old?.map(c => c.id === item.id ? { ...c, ...weeklyPatch } : c)
      );
      qc.invalidateQueries({ queryKey: ["/api/weekly-checkins"] });
      toast({ title: "Check-in semanal atualizado", description: "Suas alterações foram salvas." });
      setIsEditing(false);
      onClose();
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    }
  };

  const weeklyFields: { field: keyof WeeklyEditForm; label: string; placeholder: string }[] = [
    { field: "planned", label: "O que foi planejado para essa semana?", placeholder: "Descreva as iniciativas e ações planejadas" },
    { field: "executed", label: "O que foi efetivamente executado?", placeholder: "O que realmente aconteceu?" },
    { field: "progressSummary", label: "Resumo do progresso desta semana", placeholder: "Como avançou em relação ao objetivo?" },
    { field: "blockers", label: "Quais foram os principais bloqueios?", placeholder: "O que impediu a execução plena?" },
    { field: "adjustments", label: "Que ajustes são necessários?", placeholder: "O que deve mudar na próxima semana?" },
    { field: "nextWeekPriority", label: "Qual é a prioridade para a próxima semana?", placeholder: "O que mais importa executar?" },
    { field: "initiativeDecision", label: "Decisão sobre iniciativas", placeholder: "Continuar, pausar, cancelar..." },
  ];

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { setIsEditing(false); onClose(); } }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            Check-in Semanal
          </SheetTitle>
        </SheetHeader>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 shrink-0" />
                <span>Editando check-in</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-amber-800 hover:bg-amber-100 h-auto py-0.5 px-2"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
            </div>

            {item.goalTitle && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Meta</p>
                <p className="text-sm font-medium">{item.goalTitle}</p>
              </div>
            )}
            {item.weekStartDate && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Semana de</p>
                <p className="text-sm">{formatDateOnly(item.weekStartDate)}</p>
              </div>
            )}

            {weeklyFields.map(q => (
              <div key={q.field} className="space-y-1.5">
                <Label htmlFor={`edit-weekly-${q.field}`} className="text-sm font-medium">{q.label}</Label>
                <Textarea
                  id={`edit-weekly-${q.field}`}
                  placeholder={q.placeholder}
                  {...register(q.field as any)}
                  rows={3}
                />
              </div>
            ))}

            <div className="flex items-center gap-2">
              <Controller
                name="needsRegionalSupport"
                control={control}
                render={({ field }) => (
                  <Checkbox id="edit-weekly-support" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="edit-weekly-support" className="cursor-pointer">Preciso de suporte da equipe regional</Label>
            </div>

            <Button type="submit" className="w-full" disabled={update.isPending}>
              {update.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            {item.goalTitle && <DetailRow label="Meta" value={<span className="font-medium">{item.goalTitle}</span>} />}
            {item.weekStartDate && <DetailRow label="Semana de" value={formatDateOnly(item.weekStartDate)} />}
            <DetailRow label="O que foi planejado" value={item.planned} />
            <DetailRow label="O que foi executado" value={item.executed} />
            {item.executionPercentage != null && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Percentual executado</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.executionPercentage}%` }} />
                  </div>
                  <span className="text-sm font-mono font-medium w-10 text-right">{item.executionPercentage}%</span>
                </div>
              </div>
            )}
            <DetailRow label="Resumo do progresso" value={item.progressSummary} />
            <DetailRow label="Principais bloqueios" value={item.blockers} />
            <DetailRow label="Ajustes necessários" value={item.adjustments} />
            <DetailRow label="Prioridade da próxima semana" value={item.nextWeekPriority} />
            <DetailRow label="Decisão sobre iniciativas" value={item.initiativeDecision} />
            {item.needsRegionalSupport && (
              <div className="flex items-center gap-1.5 text-sm text-amber-700 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Solicitou suporte da equipe regional</span>
              </div>
            )}
            {item.userName && <DetailRow label="Registrado por" value={item.userName} />}
            <DetailRow label="Criado em" value={formatDate(item.createdAt)} />

            <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar check-in
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface MonthlyEditForm {
  kriProgress: string;
  improvedKpis: string;
  worsenedKpis: string;
  initiativesThatWorked: string;
  initiativesThatDidNotWork: string;
  continueDoing: string;
  stopDoing: string;
  startDoing: string;
  nextMonthFocus: string;
}

function MonthlyDetailSheet({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  const monthLabel = item.month && item.year ? `${MONTHS[(item.month as number) - 1]} ${item.year}` : null;
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const update = useUpdateMonthlyCheckin();

  const { register, handleSubmit } = useForm<MonthlyEditForm>({
    defaultValues: {
      kriProgress: item.kriProgress ?? "",
      improvedKpis: item.improvedKpis ?? "",
      worsenedKpis: item.worsenedKpis ?? "",
      initiativesThatWorked: item.initiativesThatWorked ?? "",
      initiativesThatDidNotWork: item.initiativesThatDidNotWork ?? "",
      continueDoing: item.continueDoing ?? "",
      stopDoing: item.stopDoing ?? "",
      startDoing: item.startDoing ?? "",
      nextMonthFocus: item.nextMonthFocus ?? "",
    },
  });

  const onSubmit = async (data: MonthlyEditForm) => {
    try {
      await update.mutateAsync({
        id: item.id,
        data: {
          kriProgress: data.kriProgress || undefined,
          improvedKpis: data.improvedKpis || undefined,
          worsenedKpis: data.worsenedKpis || undefined,
          initiativesThatWorked: data.initiativesThatWorked || undefined,
          initiativesThatDidNotWork: data.initiativesThatDidNotWork || undefined,
          continueDoing: data.continueDoing || undefined,
          stopDoing: data.stopDoing || undefined,
          startDoing: data.startDoing || undefined,
          nextMonthFocus: data.nextMonthFocus || undefined,
        },
      });
      const monthlyPatch = {
        kriProgress: data.kriProgress || undefined,
        improvedKpis: data.improvedKpis || undefined,
        worsenedKpis: data.worsenedKpis || undefined,
        initiativesThatWorked: data.initiativesThatWorked || undefined,
        initiativesThatDidNotWork: data.initiativesThatDidNotWork || undefined,
        continueDoing: data.continueDoing || undefined,
        stopDoing: data.stopDoing || undefined,
        startDoing: data.startDoing || undefined,
        nextMonthFocus: data.nextMonthFocus || undefined,
      };
      qc.setQueriesData<any[]>({ queryKey: ["/api/monthly-checkins"] }, old =>
        old?.map(c => c.id === item.id ? { ...c, ...monthlyPatch } : c)
      );
      qc.invalidateQueries({ queryKey: ["/api/monthly-checkins"] });
      toast({ title: "Check-in mensal atualizado", description: "Suas alterações foram salvas." });
      setIsEditing(false);
      onClose();
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    }
  };

  const monthlyFields: { field: keyof MonthlyEditForm; label: string; placeholder: string }[] = [
    { field: "kriProgress", label: "Como o KRI evoluiu este mês?", placeholder: "Descreva o progresso em relação ao resultado esperado" },
    { field: "improvedKpis", label: "Quais KPIs melhoraram?", placeholder: "Liste os indicadores que avançaram" },
    { field: "worsenedKpis", label: "Quais KPIs pioraram ou ficaram estagnados?", placeholder: "Liste os indicadores que regrediu ou não moveu" },
    { field: "initiativesThatWorked", label: "Quais iniciativas funcionaram bem?", placeholder: "O que gerou resultado real?" },
    { field: "initiativesThatDidNotWork", label: "Quais iniciativas não funcionaram?", placeholder: "O que não trouxe o resultado esperado?" },
    { field: "continueDoing", label: "O que continuar fazendo?", placeholder: "Práticas que valem manter" },
    { field: "stopDoing", label: "O que parar de fazer?", placeholder: "O que está consumindo energia sem resultado" },
    { field: "startDoing", label: "O que começar a fazer?", placeholder: "Novas ações para o próximo mês" },
    { field: "nextMonthFocus", label: "Qual o foco principal do próximo mês?", placeholder: "A prioridade absoluta do próximo período" },
  ];

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { setIsEditing(false); onClose(); } }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-purple-500" />
            Check-in Mensal
          </SheetTitle>
        </SheetHeader>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 shrink-0" />
                <span>Editando check-in{monthLabel ? ` de ${monthLabel}` : ""}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-amber-800 hover:bg-amber-100 h-auto py-0.5 px-2"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
            </div>

            {item.goalTitle && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Meta</p>
                <p className="text-sm font-medium">{item.goalTitle}</p>
              </div>
            )}
            {monthLabel && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Mês</p>
                <p className="text-sm">{monthLabel}</p>
              </div>
            )}

            {monthlyFields.map((q, i) => (
              <div key={q.field} className="space-y-1.5">
                <Label htmlFor={`edit-monthly-${q.field}`} className="text-sm font-medium">
                  <span className="text-muted-foreground mr-1">{i + 1}.</span>{q.label}
                </Label>
                <Textarea
                  id={`edit-monthly-${q.field}`}
                  placeholder={q.placeholder}
                  {...register(q.field)}
                  rows={3}
                />
              </div>
            ))}

            <Button type="submit" className="w-full" disabled={update.isPending}>
              {update.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            {item.goalTitle && <DetailRow label="Meta" value={<span className="font-medium">{item.goalTitle}</span>} />}
            {monthLabel && <DetailRow label="Mês" value={monthLabel} />}
            <DetailRow label="Evolução do KRI" value={item.kriProgress} />
            <DetailRow label="KPIs que melhoraram" value={item.improvedKpis} />
            <DetailRow label="KPIs que pioraram ou estagnaram" value={item.worsenedKpis} />
            <DetailRow label="Iniciativas que funcionaram" value={item.initiativesThatWorked} />
            <DetailRow label="Iniciativas que não funcionaram" value={item.initiativesThatDidNotWork} />
            <DetailRow label="Continuar fazendo" value={item.continueDoing} />
            <DetailRow label="Parar de fazer" value={item.stopDoing} />
            <DetailRow label="Começar a fazer" value={item.startDoing} />
            <DetailRow label="Foco do próximo mês" value={item.nextMonthFocus} />
            {item.userName && <DetailRow label="Registrado por" value={item.userName} />}
            <DetailRow label="Criado em" value={formatDate(item.createdAt)} />

            <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar check-in
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ProgressDetailSheet({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  const increased = (item.newProgress ?? 0) > (item.previousProgress ?? 0);
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {increased
              ? <TrendingUp className="h-4 w-4 text-green-600" />
              : <TrendingDown className="h-4 w-4 text-red-500" />}
            Atualização de Progresso
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {item.entityType && <DetailRow label="Tipo" value={<Badge variant="outline">{item.entityType}</Badge>} />}
          {item.previousProgress != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Progresso</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{item.previousProgress}%</span>
                {increased
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                <span className="font-semibold">{item.newProgress}%</span>
              </div>
            </div>
          )}
          {(item.previousStatus || item.newStatus) && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.previousStatus && <Badge variant="outline">{item.previousStatus}</Badge>}
                {item.newStatus && item.newStatus !== item.previousStatus && (
                  <>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30">{item.newStatus}</Badge>
                  </>
                )}
              </div>
            </div>
          )}
          <DetailRow label="Nota" value={item.note} />
          {item.userName && <DetailRow label="Registrado por" value={item.userName} />}
          <DetailRow label="Criado em" value={formatDate(item.createdAt)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

type HistItem = { id: string; type: "daily" | "weekly" | "monthly" | "progress"; date: string; data: any };

function HistoryCard({ item, onClick }: { item: HistItem; onClick: () => void }) {
  const base = "relative cursor-pointer group";
  return (
    <div className={base} data-testid={`history-item-${item.id}`} onClick={onClick}>
      <div className="absolute -left-6 top-3.5 w-3 h-3 rounded-full border-2 border-background bg-primary group-hover:bg-primary/80 transition-colors" />
      {item.type === "daily" && <DailyCard item={item.data} />}
      {item.type === "weekly" && <WeeklyCard item={item.data} />}
      {item.type === "monthly" && <MonthlyCard item={item.data} />}
      {item.type === "progress" && <ProgressCard item={item.data} />}
    </div>
  );
}

type DatePreset = "all" | "7d" | "30d" | "month" | "custom";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
  { value: "custom", label: "Personalizado" },
];

function getPresetRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (preset === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to: null };
  }
  if (preset === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    return { from, to: null };
  }
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: null };
  }
  return { from: null, to: null };
}

function CountBadge({ count, last }: { count: number; last: string | null }) {
  function recencyClass(iso: string | null): string {
    if (!iso) return "text-muted-foreground";
    const days = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 7) return "text-green-600";
    if (days <= 30) return "text-yellow-600";
    return "text-red-500";
  }
  const cls = count > 0 ? recencyClass(last) : "text-muted-foreground";
  return (
    <div className="text-center min-w-[64px]">
      <span className={`text-sm font-semibold ${cls}`}>{count}</span>
      {last ? (
        <p className={`text-[11px] leading-tight mt-0.5 ${cls} opacity-80`}>{formatDate(last)}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">—</p>
      )}
    </div>
  );
}

function ComparativoView({ onSelectFranchise }: { onSelectFranchise: (id: number) => void }) {
  const { data: rows = [], isLoading } = useGetCheckinComparison({
    query: { queryKey: getGetCheckinComparisonQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma franquia encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              Franquia
            </th>
            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />Diário
              </div>
            </th>
            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />Semanal
              </div>
            </th>
            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                <BarChart2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />Mensal
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {(rows as CheckinComparison[]).map((row, i) => (
            <tr
              key={row.franchiseId}
              className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
              onClick={() => onSelectFranchise(row.franchiseId)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{row.franchiseName}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                </div>
              </td>
              <td className="px-3 py-3">
                <CountBadge count={row.dailyCount} last={row.lastDaily ?? null} />
              </td>
              <td className="px-3 py-3">
                <CountBadge count={row.weeklyCount} last={row.lastWeekly ?? null} />
              </td>
              <td className="px-3 py-3">
                <CountBadge count={row.monthlyCount} last={row.lastMonthly ?? null} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<HistItem | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [viewMode, setViewMode] = useState<"timeline" | "comparativo">("timeline");
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();

  const fid = franchiseId ?? undefined;
  const enabled = !!franchiseId;
  const queryOpts = (key: any) => ({ query: { enabled, queryKey: key } });

  const { data: daily = [], isLoading: loadingDaily } = useListDailyCheckins(
    { franchiseId: fid }, queryOpts(getListDailyCheckinsQueryKey({ franchiseId: fid }))
  );
  const { data: weekly = [], isLoading: loadingWeekly } = useListWeeklyCheckins(
    { franchiseId: fid }, queryOpts(getListWeeklyCheckinsQueryKey({ franchiseId: fid }))
  );
  const { data: monthly = [], isLoading: loadingMonthly } = useListMonthlyCheckins(
    { franchiseId: fid }, queryOpts(getListMonthlyCheckinsQueryKey({ franchiseId: fid }))
  );
  const { data: progress = [], isLoading: loadingProgress } = useListProgressHistory(
    { franchiseId: fid }, queryOpts(getListProgressHistoryQueryKey({ franchiseId: fid }))
  );

  const isLoading = enabled && (loadingDaily || loadingWeekly || loadingMonthly || loadingProgress);

  const allItems: HistItem[] = useMemo(() => [
    ...(daily as any[]).map(c => ({ id: `d-${c.id}`, type: "daily" as const, date: c.createdAt, data: c })),
    ...(weekly as any[]).map(c => ({ id: `w-${c.id}`, type: "weekly" as const, date: c.createdAt, data: c })),
    ...(monthly as any[]).map(c => ({ id: `m-${c.id}`, type: "monthly" as const, date: c.createdAt, data: c })),
    ...(progress as any[]).map(p => ({ id: `p-${p.id}`, type: "progress" as const, date: p.createdAt, data: p })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [daily, weekly, monthly, progress]);

  const dateFilteredItems = useMemo(() => {
    if (datePreset === "all") return allItems;

    let from: Date | null = null;
    let to: Date | null = null;

    if (datePreset === "custom") {
      from = customFrom ? new Date(customFrom + "T00:00:00") : null;
      to = customTo ? new Date(customTo + "T23:59:59") : null;
      if (!from && !to) return allItems;
    } else {
      const range = getPresetRange(datePreset);
      from = range.from;
      to = range.to;
    }

    return allItems.filter(item => {
      const d = new Date(item.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [allItems, datePreset, customFrom, customTo]);

  const filtered = dateFilteredItems.filter(i => {
    if (tab === "all") return true;
    return i.type === tab;
  });

  const counts = {
    all: dateFilteredItems.length,
    daily: dateFilteredItems.filter(i => i.type === "daily").length,
    weekly: dateFilteredItems.filter(i => i.type === "weekly").length,
    monthly: dateFilteredItems.filter(i => i.type === "monthly").length,
    progress: dateFilteredItems.filter(i => i.type === "progress").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
          <p className="text-muted-foreground mt-1">Registro de check-ins e atualizações de progresso</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1 shrink-0">
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "timeline"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Histórico
            </button>
            <button
              onClick={() => setViewMode("comparativo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "comparativo"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableProperties className="h-3.5 w-3.5" />
              Comparativo
            </button>
          </div>
        )}
      </div>

      {isAdmin && viewMode === "comparativo" ? (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />Últimos 7 dias</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />8–30 dias</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />Mais de 30 dias</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />Nenhum</span>
          </div>
          <p className="text-xs text-muted-foreground -mt-3">Clique em uma franquia para ver o histórico detalhado.</p>
          <ComparativoView
            onSelectFranchise={id => {
              setAdminFranchiseId(id);
              setViewMode("timeline");
            }}
          />
        </>
      ) : (
        <>
      {(isAdmin || isSocio) && (
        <FranchisePicker franchises={franchises} value={isSocio ? socioFranchiseId : adminFranchiseId} onChange={isSocio ? setSocioFranchiseId : setAdminFranchiseId} />
      )}

      {(isAdmin || isSocio) && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o histórico." />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span>Período:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DATE_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setDatePreset(p.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      datePreset === p.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {datePreset === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">De:</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Até:</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                {(customFrom || customTo) && (
                  <button
                    onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-auto flex-wrap gap-1">
                <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
                <TabsTrigger value="daily" className="flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" />Diário ({counts.daily})
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />Semanal ({counts.weekly})
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" />Mensal ({counts.monthly})
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />Progresso ({counts.progress})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum registro encontrado</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {datePreset !== "all"
                    ? "Nenhum check-in encontrado no período selecionado"
                    : "Os check-ins e atualizações de progresso aparecerão aqui"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3 pl-10">
                {filtered.map(item => (
                  <HistoryCard key={item.id} item={item} onClick={() => setSelected(item)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
        </>
      )}

      {selected?.type === "daily" && (
        <DailyDetailSheet item={selected.data} open={true} onClose={() => setSelected(null)} />
      )}
      {selected?.type === "weekly" && (
        <WeeklyDetailSheet item={selected.data} open={true} onClose={() => setSelected(null)} />
      )}
      {selected?.type === "monthly" && (
        <MonthlyDetailSheet item={selected.data} open={true} onClose={() => setSelected(null)} />
      )}
      {selected?.type === "progress" && (
        <ProgressDetailSheet item={selected.data} open={true} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function DailyCard({ item }: { item: any }) {
  return (
    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <CheckSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in Diário</span>
                {item.goalTitle && <span className="text-xs text-muted-foreground truncate">{item.goalTitle}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.executedToday && (
                  <div className="flex items-center gap-1">
                    <ExecutionIcon v={item.executedToday} />
                    <Badge variant="outline" className={`text-xs ${executionColor[item.executedToday] || ""}`}>
                      {executionLabel[item.executedToday] || item.executedToday}
                    </Badge>
                  </div>
                )}
                {item.progressToday != null && (
                  <span className="text-xs text-muted-foreground">{item.progressToday}% progresso</span>
                )}
                {item.needsHelp && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                    <AlertCircle className="h-3 w-3 mr-1" />Pediu apoio
                  </Badge>
                )}
              </div>
              {item.blocker && (
                <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-xs">Bloqueio: {item.blocker}</p>
              )}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyCard({ item }: { item: any }) {
  return (
    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in Semanal</span>
                {item.goalTitle && <span className="text-xs text-muted-foreground truncate">{item.goalTitle}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.executionPercentage != null && (
                  <span className="text-xs font-medium">{item.executionPercentage}% executado</span>
                )}
                {item.needsRegionalSupport && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                    <AlertCircle className="h-3 w-3 mr-1" />Apoio regional
                  </Badge>
                )}
              </div>
              {item.blockers && (
                <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-xs">Bloqueio: {item.blockers}</p>
              )}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyCard({ item }: { item: any }) {
  const monthLabel = item.month && item.year ? `${MONTHS[(item.month as number) - 1]} ${item.year}` : null;
  return (
    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <BarChart2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in Mensal</span>
                {item.goalTitle && <span className="text-xs text-muted-foreground truncate">{item.goalTitle}</span>}
              </div>
              {monthLabel && <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressCard({ item }: { item: any }) {
  const increased = (item.newProgress ?? 0) > (item.previousProgress ?? 0);
  return (
    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            {increased
              ? <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              : <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            }
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Atualização de Progresso
                </span>
                {item.entityType && (
                  <Badge variant="outline" className="text-xs">{item.entityType}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {item.previousProgress != null && (
                  <>
                    <span className="text-sm text-muted-foreground">{item.previousProgress}%</span>
                    {increased
                      ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                      : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    }
                    <span className="text-sm font-semibold">{item.newProgress}%</span>
                  </>
                )}
              </div>
              {item.note && <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-xs">{item.note}</p>}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
