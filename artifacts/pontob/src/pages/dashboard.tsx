import { useAuth } from "@/lib/auth";
import {
  useGetFranchiseDashboard, getGetFranchiseDashboardQueryKey,
  useListFranchiseKris, getListFranchiseKrisQueryKey,
  useUpsertFranchiseKri,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, LayoutDashboard, Target, CheckCircle2, Clock, Pencil, Users, FileSignature, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_NAMES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface KriForm {
  creci: string;
  cres: string;
  vgh: string;
  notes: string;
}

function formatVgh(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [kriOpen, setKriOpen] = useState(false);

  const dashParams = { franchiseId: franchiseId! };
  const { data, isLoading } = useGetFranchiseDashboard(
    dashParams,
    { query: { enabled: !!franchiseId, queryKey: getGetFranchiseDashboardQueryKey(dashParams) } }
  );

  const kriParams = { franchiseId: franchiseId ?? undefined, year: currentYear };
  const kriQueryKey = getListFranchiseKrisQueryKey(kriParams);
  const { data: krisData = [] } = useListFranchiseKris(
    kriParams,
    { query: { enabled: !!franchiseId, queryKey: kriQueryKey } }
  );

  const currentKri = krisData.find(k => k.year === currentYear && k.month === currentMonth);
  const upsert = useUpsertFranchiseKri();

  const { register, handleSubmit, reset } = useForm<KriForm>({
    values: {
      creci: currentKri?.creci != null ? String(currentKri.creci) : "",
      cres: currentKri?.cres != null ? String(currentKri.cres) : "",
      vgh: currentKri?.vgh != null ? String(currentKri.vgh) : "",
      notes: currentKri?.notes ?? "",
    },
  });

  const onKriSubmit = async (form: KriForm) => {
    if (!franchiseId) return;
    try {
      await upsert.mutateAsync({
        data: {
          franchiseId,
          year: currentYear,
          month: currentMonth,
          creci: form.creci ? parseInt(form.creci) : null,
          cres: form.cres ? parseInt(form.cres) : null,
          vgh: form.vgh ? parseFloat(form.vgh) : null,
          notes: form.notes || null,
        },
      });
      toast({ title: `KRIs de ${MONTH_NAMES_FULL[currentMonth - 1]} atualizados` });
      qc.invalidateQueries({ queryKey: kriQueryKey });
      setKriOpen(false);
    } catch {
      toast({ title: "Erro ao salvar KRIs", variant: "destructive" });
    }
  };

  const kriChartData = krisData
    .slice(-6)
    .map(k => ({
      name: MONTH_NAMES[k.month - 1],
      CRECI: k.creci ?? 0,
      CREs: k.cres ?? 0,
    }));

  const canEdit = user?.role !== "responsavel_interno";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bata o olho e saiba onde avançar.</p>
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o dashboard." />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pontuação</CardTitle>
                <LayoutDashboard className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.score || 0}</div>
                <p className="text-xs text-muted-foreground">{data?.scoreLabel || "Sem dados"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.activeGoals || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Execução da Semana</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.weekExecution || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Metas Atrasadas</CardTitle>
                <Clock className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{data?.delayedGoals || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>KRIs do Mês — {MONTH_NAMES_FULL[currentMonth - 1]} {currentYear}</CardTitle>
                <CardDescription>CRECI · CREs · VGH — os 3 indicadores-chave da franquia</CardDescription>
              </div>
              {canEdit && (
                <Dialog open={kriOpen} onOpenChange={v => { setKriOpen(v); if (!v) reset(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Lançar KRIs
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>KRIs de {MONTH_NAMES_FULL[currentMonth - 1]} {currentYear}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onKriSubmit)} className="space-y-4 mt-2">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> CRECI — Corretores com registro ativo
                        </Label>
                        <Input type="number" min={0} placeholder="Ex: 18" {...register("creci")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <FileSignature className="h-3.5 w-3.5" /> CREs — Contratos de Representação Exclusiva
                        </Label>
                        <Input type="number" min={0} placeholder="Ex: 24" {...register("cres")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" /> VGH — Valor Geral de Honorários (R$)
                        </Label>
                        <Input type="number" min={0} step="0.01" placeholder="Ex: 85000" {...register("vgh")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Observações</Label>
                        <Input placeholder="Opcional" {...register("notes")} />
                      </div>
                      <div className="flex gap-2 justify-end pt-2">
                        <Button variant="outline" type="button" onClick={() => setKriOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={upsert.isPending}>
                          {upsert.isPending ? "Salvando..." : "Salvar KRIs"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                    <Users className="h-3.5 w-3.5" /> CRECI
                  </div>
                  <div className="text-3xl font-bold">
                    {currentKri?.creci != null ? currentKri.creci : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">corretores ativos</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                    <FileSignature className="h-3.5 w-3.5" /> CREs
                  </div>
                  <div className="text-3xl font-bold">
                    {currentKri?.cres != null ? currentKri.cres : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">contratos exclusivos</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                    <DollarSign className="h-3.5 w-3.5" /> VGH
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatVgh(currentKri?.vgh)}
                  </div>
                  <div className="text-xs text-muted-foreground">honorários do mês</div>
                </div>
              </div>
              {!currentKri && canEdit && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Nenhum KRI lançado para este mês ainda. Clique em <strong>Lançar KRIs</strong> para registrar.
                </p>
              )}
              {kriChartData.length > 1 && (
                <div className="mt-6 h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kriChartData} barGap={4}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="CRECI" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="CREs" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Progresso por Dimensão</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data?.progressByDimension?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.progressByDimension} layout="vertical" margin={{ left: 40 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="dimensionName" type="category" axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="progressPercentage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados de dimensão</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Bloqueios</CardTitle>
                <CardDescription>O que não é registrado não pode ser resolvido.</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.topBlockers?.length ? (
                  <ul className="space-y-2">
                    {data.topBlockers.map((blocker, i) => (
                      <li key={i} className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                        <span className="text-sm">{blocker}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum bloqueio registrado.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
