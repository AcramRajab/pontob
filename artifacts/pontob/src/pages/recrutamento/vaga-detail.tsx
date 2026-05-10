import { useRoute, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetVaga, getGetVagaQueryKey,
  useCreateCandidato, useUpdateCandidato, useDeleteCandidato,
  useUpdateVaga, VagaUpdateStatus,
} from "@workspace/api-client-react";
import { VagaAiPanel } from "./vaga-ai-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Loader2, Users, GripVertical, ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

const STAGES = ["interessado", "triagem", "entrevista", "proposta", "contratado", "arquivado"] as const;
type Stage = typeof STAGES[number];

const stageLabel: Record<Stage, string> = {
  interessado: "Interessado",
  triagem: "Triagem",
  entrevista: "Entrevista",
  proposta: "Proposta",
  contratado: "Contratado",
  arquivado: "Arquivado",
};

const stageColor: Record<Stage, string> = {
  interessado: "bg-gray-100 text-gray-700",
  triagem: "bg-blue-100 text-blue-700",
  entrevista: "bg-purple-100 text-purple-700",
  proposta: "bg-orange-100 text-orange-700",
  contratado: "bg-green-100 text-green-700",
  arquivado: "bg-muted text-muted-foreground",
};

const recLabel: Record<string, string> = {
  avancar: "✓ Avançar",
  aguardar: "⏸ Aguardar",
  rejeitar: "✗ Rejeitar",
};
const recColor: Record<string, string> = {
  avancar: "text-green-700 bg-green-50 border-green-200",
  aguardar: "text-yellow-700 bg-yellow-50 border-yellow-200",
  rejeitar: "text-red-700 bg-red-50 border-red-200",
};

const vagaStatusLabel: Record<string, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  preenchida: "Preenchida",
  rascunho: "Rascunho",
};

interface CandidatoForm {
  name: string;
  email: string;
  phone: string;
  source: string;
  currentRole: string;
  notes: string;
}

export default function VagaDetail() {
  const [, params] = useRoute("/recrutamento/vagas/:id");
  const id = parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const qKey = getGetVagaQueryKey(id);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedCandidato, setSelectedCandidato] = useState<any>(null);

  const canWrite = user?.role !== "responsavel_interno";

  const { data: vaga, isLoading } = useGetVaga(id, { query: { queryKey: qKey } });
  const createCandidato = useCreateCandidato();
  const updateCandidato = useUpdateCandidato();
  const deleteCandidato = useDeleteCandidato();
  const updateVaga = useUpdateVaga();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CandidatoForm>();

  const invalidate = () => qc.invalidateQueries({ queryKey: qKey });

  const onAddCandidato = async (data: CandidatoForm) => {
    try {
      await createCandidato.mutateAsync({
        id,
        data: {
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          source: data.source || undefined,
          currentRole: data.currentRole || undefined,
          notes: data.notes || undefined,
          stage: "interessado",
        },
      });
      await invalidate();
      toast({ title: "Candidato adicionado" });
      reset();
      setAddOpen(false);
    } catch {
      toast({ title: "Erro ao adicionar candidato", variant: "destructive" });
    }
  };

  const onMoveStage = async (candidatoId: number, direction: "forward" | "back") => {
    const candidato = (vaga as any)?.candidatos?.find((c: any) => c.id === candidatoId);
    if (!candidato) return;
    const idx = STAGES.indexOf(candidato.stage as Stage);
    const newIdx = direction === "forward" ? Math.min(idx + 1, STAGES.length - 1) : Math.max(idx - 1, 0);
    if (newIdx === idx) return;
    try {
      await updateCandidato.mutateAsync({ id: candidatoId, data: { stage: STAGES[newIdx] } });
      await invalidate();
    } catch {
      toast({ title: "Erro ao mover candidato", variant: "destructive" });
    }
  };

  const onSetRecommendation = async (candidatoId: number, recommendation: string) => {
    try {
      await updateCandidato.mutateAsync({ id: candidatoId, data: { recommendation } });
      await invalidate();
    } catch {
      toast({ title: "Erro ao atualizar recomendação", variant: "destructive" });
    }
  };

  const onDeleteCandidato = async (candidatoId: number) => {
    try {
      await deleteCandidato.mutateAsync({ id: candidatoId });
      await invalidate();
      setSelectedCandidato(null);
      toast({ title: "Candidato removido" });
    } catch {
      toast({ title: "Erro ao remover candidato", variant: "destructive" });
    }
  };

  const onUpdateVagaStatus = async (status: string) => {
    try {
      await updateVaga.mutateAsync({ id, data: { status: status as VagaUpdateStatus } });
      await invalidate();
      toast({ title: "Status da vaga atualizado" });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!vaga) return <div className="text-center py-20 text-muted-foreground">Vaga não encontrada.</div>;

  const candidatos: any[] = (vaga as any).candidatos ?? [];

  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = candidatos.filter((c) => c.stage === s);
    return acc;
  }, {} as Record<Stage, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/recrutamento")} className="mt-1 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{vaga.title}</h1>
              {vaga.goalTitle && (
                <p className="text-xs text-muted-foreground mt-0.5">Meta: {vaga.goalTitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canWrite && (
                <Select value={(vaga as any).status || "ativa"} onValueChange={onUpdateVagaStatus}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(vagaStatusLabel).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {canWrite && (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Candidato
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="mb-4">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <span>IA Recruiter</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">IA</span>
          </TabsTrigger>
          {(vaga.profileSummary || vaga.mustHaves) && (
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ai">
          <VagaAiPanel vagaId={id} />
        </TabsContent>

        {(vaga.profileSummary || vaga.mustHaves) && (
          <TabsContent value="profile">
            <Card>
              <CardContent className="pt-4 grid md:grid-cols-2 gap-4">
                {vaga.profileSummary && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Perfil buscado</p>
                    <p className="text-sm">{vaga.profileSummary}</p>
                  </div>
                )}
                {vaga.mustHaves && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Must-haves</p>
                    <p className="text-sm whitespace-pre-line">{vaga.mustHaves}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="pipeline">
        {/* Pipeline summary bar */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {STAGES.map((stage) => (
            <div key={stage} className={`rounded-lg p-3 text-center ${stageColor[stage]}`}>
              <p className="text-xl font-bold">{byStage[stage].length}</p>
              <p className="text-xs font-medium leading-tight mt-0.5">{stageLabel[stage]}</p>
            </div>
          ))}
        </div>

        {/* Kanban columns */}
        {candidatos.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum candidato ainda</p>
            {canWrite && (
              <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar candidato
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {STAGES.filter(s => s !== "arquivado" || byStage.arquivado.length > 0).map((stage) => (
            byStage[stage].length > 0 && (
              <div key={stage}>
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${stageColor[stage]}`}>
                  <span>{stageLabel[stage]}</span>
                  <span className="font-bold">{byStage[stage].length}</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {byStage[stage].map((c: any) => (
                    <Card
                      key={c.id}
                      className="cursor-pointer hover:border-primary/40 transition-all"
                      onClick={() => setSelectedCandidato(c)}
                    >
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            {c.currentRole && <p className="text-xs text-muted-foreground truncate">{c.currentRole}</p>}
                            {c.source && <p className="text-xs text-muted-foreground/70">via {c.source}</p>}
                          </div>
                          {c.recommendation && (
                            <Badge variant="outline" className={`text-xs shrink-0 ${recColor[c.recommendation] || ""}`}>
                              {recLabel[c.recommendation] || c.recommendation}
                            </Badge>
                          )}
                        </div>
                        {c.notes && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t line-clamp-2 italic">{c.notes}</p>
                        )}
                        {canWrite && (
                          <div className="flex gap-1 mt-2 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs flex-1"
                              disabled={STAGES.indexOf(stage) === 0}
                              onClick={(e) => { e.stopPropagation(); onMoveStage(c.id, "back"); }}
                            >
                              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Voltar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs flex-1"
                              disabled={STAGES.indexOf(stage) === STAGES.length - 1}
                              onClick={(e) => { e.stopPropagation(); onMoveStage(c.id, "forward"); }}
                            >
                              Avançar <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>

      {/* Add candidate dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Candidato</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAddCandidato)} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input placeholder="Nome completo" {...register("name", { required: true })} />
              {errors.name && <p className="text-xs text-destructive">Nome é obrigatório</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="email@exemplo.com" {...register("email")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input placeholder="(48) 9xxxx-xxxx" {...register("phone")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cargo atual</Label>
              <Input placeholder="Corretor, Gerente comercial..." {...register("currentRole")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Origem</Label>
              <Input placeholder="Indicação, LinkedIn, Portais, Direto..." {...register("source")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas iniciais</Label>
              <Textarea rows={2} placeholder="Primeiras impressões, pontos de atenção..." {...register("notes")} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setAddOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={createCandidato.isPending}>
                {createCandidato.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Candidato detail dialog */}
      {selectedCandidato && (
        <Dialog open={!!selectedCandidato} onOpenChange={() => setSelectedCandidato(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedCandidato.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedCandidato.currentRole && (
                  <div><p className="text-xs text-muted-foreground">Cargo atual</p><p>{selectedCandidato.currentRole}</p></div>
                )}
                {selectedCandidato.source && (
                  <div><p className="text-xs text-muted-foreground">Origem</p><p>{selectedCandidato.source}</p></div>
                )}
                {selectedCandidato.email && (
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="truncate">{selectedCandidato.email}</p></div>
                )}
                {selectedCandidato.phone && (
                  <div><p className="text-xs text-muted-foreground">Telefone</p><p>{selectedCandidato.phone}</p></div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Estágio atual</p>
                <Badge className={`${stageColor[selectedCandidato.stage as Stage] || ""}`}>
                  {stageLabel[selectedCandidato.stage as Stage] || selectedCandidato.stage}
                </Badge>
              </div>

              {canWrite && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recomendação</p>
                  <div className="flex gap-2">
                    {["avancar", "aguardar", "rejeitar"].map((rec) => (
                      <button
                        key={rec}
                        className={`flex-1 text-xs py-1.5 rounded-md border font-medium transition-all ${selectedCandidato.recommendation === rec ? recColor[rec] : "text-muted-foreground border-border hover:border-primary/40"}`}
                        onClick={() => {
                          onSetRecommendation(selectedCandidato.id, rec);
                          setSelectedCandidato({ ...selectedCandidato, recommendation: rec });
                        }}
                      >
                        {recLabel[rec]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCandidato.notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                  <p className="text-sm text-muted-foreground italic whitespace-pre-line">{selectedCandidato.notes}</p>
                </div>
              )}

              {canWrite && (
                <div className="flex gap-2 pt-2 border-t">
                  <div className="flex gap-1 flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={STAGES.indexOf(selectedCandidato.stage) === 0}
                      onClick={() => { onMoveStage(selectedCandidato.id, "back"); setSelectedCandidato(null); }}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />Voltar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={STAGES.indexOf(selectedCandidato.stage) === STAGES.length - 1}
                      onClick={() => { onMoveStage(selectedCandidato.id, "forward"); setSelectedCandidato(null); }}
                    >
                      Avançar<ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDeleteCandidato(selectedCandidato.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
