import { useAuth } from "@/lib/auth";
import { useListHelpRequests, useCreateHelpRequest, getListHelpRequestsQueryKey, useListGoals, getListGoalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus, X } from "lucide-react";
import { useState } from "react";

const statusColor: Record<string, string> = {
  aberto: "bg-yellow-50 text-yellow-700 border-yellow-200",
  em_atendimento: "bg-blue-50 text-blue-700 border-blue-200",
  resolvido: "bg-green-50 text-green-700 border-green-200",
};

const statusLabel: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

interface NewRequestForm {
  goalId: string;
  description: string;
}

export default function Help() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const isAdmin = user?.role === "master_admin" || user?.role === "staff_regional";
  const franchiseId = user?.franchiseId;

  const helpParams = { franchiseId: franchiseId ?? undefined };
  const { data: requests = [], isLoading } = useListHelpRequests(
    helpParams,
    { query: { enabled: !!user, queryKey: getListHelpRequestsQueryKey(helpParams) } }
  );

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals = [] } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  const create = useCreateHelpRequest();
  const { register, handleSubmit, control, reset } = useForm<NewRequestForm>();

  const onSubmit = async (data: NewRequestForm) => {
    if (!franchiseId) return;
    try {
      await create.mutateAsync({
        data: {
          franchiseId,
          goalId: data.goalId ? parseInt(data.goalId) : undefined,
          description: data.description,
        },
      });
      qc.invalidateQueries({ queryKey: getListHelpRequestsQueryKey({}) });
      toast({ title: "Pedido de ajuda enviado" });
      reset();
      setShowForm(false);
    } catch {
      toast({ title: "Erro ao enviar pedido", variant: "destructive" });
    }
  };

  const canCreate = !!franchiseId && !isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajuda</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Solicitações de apoio das franquias" : "Solicite suporte da equipe regional"}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm(!showForm)} data-testid="button-new-help-request" size="sm">
            {showForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {showForm ? "Cancelar" : "Nova solicitação"}
          </Button>
        )}
      </div>

      {showForm && canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova Solicitação de Ajuda</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Meta relacionada (opcional)</Label>
                <Controller
                  name="goalId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-goal">
                        <SelectValue placeholder="Selecione uma meta (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {goals.map((g: any) => (
                          <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição do problema *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o que você precisa de ajuda..."
                  data-testid="textarea-description"
                  {...register("description", { required: true })}
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={create.isPending} data-testid="button-submit">
                {create.isPending ? "Enviando..." : "Enviar solicitação"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma solicitação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <Card key={req.id} data-testid={`card-help-${req.id}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm leading-relaxed">{req.description}</p>
                    {req.goalTitle && (
                      <p className="text-xs text-muted-foreground mt-1">Meta: {req.goalTitle}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-muted-foreground">
                      {req.userName && <span>{req.userName}</span>}
                      <span>{formatDate(req.createdAt)}</span>
                      {req.franchiseName && <span>{req.franchiseName}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs ${statusColor[req.status] || ""}`}>
                    {statusLabel[req.status] || req.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
