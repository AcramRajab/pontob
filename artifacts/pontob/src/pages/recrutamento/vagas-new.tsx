import { useLocation } from "wouter";
import { useCreateVaga, getListVagasQueryKey, useListGoals, getListGoalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useFranchiseContext } from "@/hooks/use-franchise-context";

interface VagaForm {
  title: string;
  goalId: string;
  description: string;
  profileSummary: string;
  mustHaves: string;
}

export default function VagaNew() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { franchiseId } = useFranchiseContext();
  const { toast } = useToast();
  const qc = useQueryClient();

  const goalsParams = franchiseId ? { franchiseId } : {};
  const { data: goals = [] } = useListGoals(goalsParams, {
    query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalsParams) },
  });

  const create = useCreateVaga();
  const { register, handleSubmit, control, formState: { errors } } = useForm<VagaForm>();

  const effectiveFranchiseId = franchiseId ?? user?.franchiseId;

  const onSubmit = async (data: VagaForm) => {
    if (!effectiveFranchiseId) {
      toast({ title: "Selecione uma franquia primeiro", variant: "destructive" });
      return;
    }
    try {
      const vaga = await create.mutateAsync({
        data: {
          franchiseId: effectiveFranchiseId,
          goalId: data.goalId && data.goalId !== "none" ? parseInt(data.goalId) : undefined,
          title: data.title,
          description: data.description || undefined,
          profileSummary: data.profileSummary || undefined,
          mustHaves: data.mustHaves || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListVagasQueryKey() });
      toast({ title: "Vaga criada com sucesso" });
      navigate(`/recrutamento/vagas/${vaga.id}`);
    } catch (err: any) {
      toast({ title: err?.message || "Erro ao criar vaga", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/recrutamento")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Vaga</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Crie uma vaga para recrutar corretores ou equipe</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Informações da Vaga</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Título da vaga *</Label>
              <Input
                placeholder="Ex: Corretor de Imóveis Sênior, Coordenador de Marketing..."
                {...register("title", { required: true })}
                data-testid="input-title"
              />
              {errors.title && <p className="text-xs text-destructive">Título é obrigatório</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Vinculada a uma meta (opcional)</Label>
              <Controller
                control={control}
                name="goalId"
                render={({ field }) => (
                  <Select value={field.value || "none"} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma meta..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma meta vinculada</SelectItem>
                      {goals.map((g: any) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">Vincule a uma meta estratégica para rastrear o impacto no crescimento da equipe.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Perfil buscado</Label>
              <Textarea
                rows={3}
                placeholder="Descreva em 1-2 frases o perfil ideal para essa vaga..."
                {...register("profileSummary")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Requisitos indispensáveis (Must-haves)</Label>
              <Textarea
                rows={3}
                placeholder="Liste os 3-4 requisitos sem os quais o candidato não pode exercer a função..."
                {...register("mustHaves")}
              />
              <p className="text-xs text-muted-foreground">Seja rigoroso aqui — muitos requisitos encolhem o pipeline desnecessariamente.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição completa</Label>
              <Textarea
                rows={4}
                placeholder="Descreva as responsabilidades, rotina esperada, e contexto da vaga..."
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => navigate("/recrutamento")} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={create.isPending} data-testid="button-submit">
            {create.isPending ? "Criando..." : "Criar Vaga"}
          </Button>
        </div>
      </form>
    </div>
  );
}
