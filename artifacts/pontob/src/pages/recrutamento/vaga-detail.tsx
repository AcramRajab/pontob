import { useRoute, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetVaga, getGetVagaQueryKey,
  useCreateCandidato, useUpdateCandidato, useDeleteCandidato,
  useUpdateVaga, VagaUpdateStatus,
} from "@workspace/api-client-react";
import { VagaAiPanel } from "./vaga-ai-panel";
import { CandidatoDialog } from "./candidato-dialog";
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
import { ArrowLeft, Plus, Loader2, Users, ChevronRight, ChevronLeft, MessageCircle, CalendarDays, ArrowRight, Pencil, Search, X } from "lucide-react";
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

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function formatInterviewDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// Pipeline conversion metrics bar
function PipelineMetrics({ candidatos }: { candidatos: any[] }) {
  const FUNNEL_STAGES: Stage[] = ["interessado", "triagem", "entrevista", "proposta", "contratado"];
  const counts = FUNNEL_STAGES.reduce((acc, s) => {
    acc[s] = candidatos.filter((c) => c.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  if (candidatos.length === 0) return null;

  return (
    <div className="flex items-center gap-0 bg-muted/40 rounded-xl px-3 py-2 mb-4 overflow-x-auto">
      {FUNNEL_STAGES.map((stage, i) => {
        const count = counts[stage];
        const prevCount = i > 0 ? counts[FUNNEL_STAGES[i - 1]] : null;
        const pct = prevCount && prevCount > 0 ? Math.round((count / prevCount) * 100) : null;
        return (
          <div key={stage} className="flex items-center gap-0 shrink-0">
            {i > 0 && (
              <div className="flex flex-col items-center mx-1.5">
                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                {pct !== null && (
                  <span className="text-[9px] text-muted-foreground font-medium">{pct}%</span>
                )}
              </div>
            )}
            <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg ${stageColor[stage]}`}>
              <span className="text-lg font-bold leading-none">{count}</span>
              <span className="text-[10px] font-medium leading-tight mt-0.5">{stageLabel[stage]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [editVagaOpen, setEditVagaOpen] = useState(false);
  const [editVagaForm, setEditVagaForm] = useState({ title: "", description: "", profileSummary: "", mustHaves: "" });
  const [search, setSearch] = useState("");

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

  const onSetInterviewDate = async (candidatoId: number, dateStr: string) => {
    try {
      await fetch(`/api/recruiting/candidatos/${candidatoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interviewAt: dateStr ? new Date(dateStr).toISOString() : null }),
      });
      await invalidate();
    } catch {
      toast({ title: "Erro ao salvar data da entrevista", variant: "destructive" });
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

  const onOpenEditVaga = () => {
    setEditVagaForm({
      title: vaga?.title ?? "",
      description: (vaga as any)?.description ?? "",
      profileSummary: vaga?.profileSummary ?? "",
      mustHaves: vaga?.mustHaves ?? "",
    });
    setEditVagaOpen(true);
  };

  const onSaveVaga = async () => {
    try {
      await updateVaga.mutateAsync({ id, data: {
        title: editVagaForm.title || undefined,
        description: editVagaForm.description || undefined,
        profileSummary: editVagaForm.profileSummary || undefined,
        mustHaves: editVagaForm.mustHaves || undefined,
      } as any });
      await invalidate();
      setEditVagaOpen(false);
      toast({ title: "Vaga atualizada" });
    } catch {
      toast({ title: "Erro ao atualizar vaga", variant: "destructive" });
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

  const filteredByStage = STAGES.reduce((acc, s) => {
    const term = search.toLowerCase().trim();
    acc[s] = term
      ? byStage[s].filter((c) => c.name.toLowerCase().includes(term))
      : byStage[s];
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
            <div className="min-w-0 flex items-center gap-2">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight truncate">{vaga.title}</h1>
                {vaga.goalTitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">Meta: {vaga.goalTitle}</p>
                )}
              </div>
              {canWrite && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground" onClick={onOpenEditVaga}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
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
          {/* Pipeline conversion metrics */}
          <PipelineMetrics candidatos={candidatos} />

          {/* Search */}
          {candidatos.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-xs"
                placeholder="Buscar candidato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Kanban */}
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
                filteredByStage[stage].length > 0 && (
                  <div key={stage}>
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${stageColor[stage]}`}>
                      <span>{stageLabel[stage]}</span>
                      <span className="font-bold">{byStage[stage].length}</span>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredByStage[stage].map((c: any) => (
                        <Card
                          key={c.id}
                          className="cursor-pointer hover:border-primary/40 transition-all"
                          onClick={() => setSelectedCandidato(c)}
                        >
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{c.name}</p>
                                {c.currentRole && <p className="text-xs text-muted-foreground truncate">{c.currentRole}</p>}
                                {c.source && <p className="text-xs text-muted-foreground/70">via {c.source}</p>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {c.phone && (
                                  <a
                                    href={whatsappUrl(c.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      <MessageCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </a>
                                )}
                                {c.recommendation && (
                                  <Badge variant="outline" className={`text-xs ${recColor[c.recommendation] || ""}`}>
                                    {recLabel[c.recommendation] || c.recommendation}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Interview date chip */}
                            {c.interviewAt && (
                              <div className="flex items-center gap-1 mt-2 text-purple-600">
                                <CalendarDays className="h-3 w-3 shrink-0" />
                                <span className="text-[11px] font-medium">{formatInterviewDate(c.interviewAt)}</span>
                              </div>
                            )}

                            {c.notes && !c.interviewAt && (
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

      {/* Edit vaga dialog */}
      <Dialog open={editVagaOpen} onOpenChange={setEditVagaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Vaga</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input
                value={editVagaForm.title}
                onChange={(e) => setEditVagaForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Corretor de Imóveis"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                rows={3}
                value={editVagaForm.description}
                onChange={(e) => setEditVagaForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descreva o papel e responsabilidades..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Perfil ideal</Label>
              <Textarea
                rows={2}
                value={editVagaForm.profileSummary}
                onChange={(e) => setEditVagaForm(p => ({ ...p, profileSummary: e.target.value }))}
                placeholder="Características e experiência desejadas..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Requisitos obrigatórios</Label>
              <Textarea
                rows={2}
                value={editVagaForm.mustHaves}
                onChange={(e) => setEditVagaForm(p => ({ ...p, mustHaves: e.target.value }))}
                placeholder="CRECI ativo, experiência em vendas..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditVagaOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                disabled={!editVagaForm.title.trim() || updateVaga.isPending}
                onClick={onSaveVaga}
              >
                {updateVaga.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        <CandidatoDialog
          candidato={selectedCandidato}
          vagaId={id}
          canWrite={canWrite}
          onClose={() => setSelectedCandidato(null)}
          onMoveStage={onMoveStage}
          onSetRecommendation={onSetRecommendation}
          onSetInterviewDate={onSetInterviewDate}
          onDeleteCandidato={onDeleteCandidato}
          onUpdate={(updated) => setSelectedCandidato(updated)}
        />
      )}
    </div>
  );
}
