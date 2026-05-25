import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Phone, Mail, Video, Users, CheckCircle2 } from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { useAuth } from "@/lib/auth";

interface CandidatoForm {
  name: string;
  phone: string;
  email: string;
  notasEntrevistaOnline: string;
  notasEntrevistaPresencial: string;
  resultadoFinal: string;
}

export default function CandidatoNew() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { franchiseId } = useFranchiseContext();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { register, handleSubmit, control, formState: { errors } } = useForm<CandidatoForm>({
    defaultValues: { resultadoFinal: "pendente" },
  });

  const effectiveFranchiseId = franchiseId ?? user?.franchiseId;

  const createMutation = useMutation({
    mutationFn: async (data: CandidatoForm) => {
      const res = await fetch("/api/recruiting/candidatos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          franchiseId: effectiveFranchiseId,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          notasEntrevistaOnline: data.notasEntrevistaOnline || null,
          notasEntrevistaPresencial: data.notasEntrevistaPresencial || null,
          resultadoFinal: data.resultadoFinal === "pendente" ? null : data.resultadoFinal,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao cadastrar candidato");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recruiting-candidatos", effectiveFranchiseId] });
      toast({ title: "Candidato cadastrado com sucesso" });
      navigate("/recrutamento");
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao cadastrar candidato", variant: "destructive" });
    },
  });

  const onSubmit = (data: CandidatoForm) => {
    if (!effectiveFranchiseId) {
      toast({ title: "Selecione uma franquia primeiro", variant: "destructive" });
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/recrutamento")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Candidato</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Registre as informações e resultado das entrevistas</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Dados do candidato */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Dados do Candidato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome completo *</Label>
              <Input
                placeholder="Ex: João da Silva"
                {...register("name", { required: "Nome é obrigatório" })}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Telefone / WhatsApp
                </Label>
                <Input
                  placeholder="(48) 9xxxx-xxxx"
                  {...register("phone")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> E-mail
                </Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  {...register("email")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entrevistas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              Entrevistas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Video className="h-3 w-3" /> Observações — Entrevista Online
              </Label>
              <Textarea
                rows={4}
                placeholder="Impressões sobre a entrevista online: postura, comunicação, experiência relatada..."
                className="resize-none"
                {...register("notasEntrevistaOnline")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Observações — Entrevista Presencial
              </Label>
              <Textarea
                rows={4}
                placeholder="Impressões sobre a entrevista presencial: apresentação pessoal, fit cultural, perguntas feitas..."
                className="resize-none"
                {...register("notasEntrevistaPresencial")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Resultado da Seleção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Aprovado para a próxima etapa?</Label>
              <Controller
                control={control}
                name="resultadoFinal"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">⏳ Pendente — ainda em avaliação</SelectItem>
                      <SelectItem value="aprovado">✅ Aprovado para a próxima etapa</SelectItem>
                      <SelectItem value="reprovado">❌ Reprovado — não avançou</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => navigate("/recrutamento")} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Cadastrando..." : "Cadastrar Candidato"}
          </Button>
        </div>
      </form>
    </div>
  );
}
