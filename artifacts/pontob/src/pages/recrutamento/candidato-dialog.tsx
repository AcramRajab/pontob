import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ChevronLeft, ChevronRight, Mail, MessageCircle, Loader2, Plus, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STAGES = ["interessado", "triagem", "entrevista", "proposta", "contratado", "arquivado"] as const;
type Stage = typeof STAGES[number];

const stageLabel: Record<Stage, string> = {
  interessado: "Interessado", triagem: "Triagem", entrevista: "Entrevista",
  proposta: "Proposta", contratado: "Contratado", arquivado: "Arquivado",
};
const stageColor: Record<Stage, string> = {
  interessado: "bg-gray-100 text-gray-700", triagem: "bg-blue-100 text-blue-700",
  entrevista: "bg-purple-100 text-purple-700", proposta: "bg-orange-100 text-orange-700",
  contratado: "bg-green-100 text-green-700", arquivado: "bg-muted text-muted-foreground",
};
const recLabel: Record<string, string> = { avancar: "✓ Avançar", aguardar: "⏸ Aguardar", rejeitar: "✗ Rejeitar" };
const recColor: Record<string, string> = {
  avancar: "text-green-700 bg-green-50 border-green-200",
  aguardar: "text-yellow-700 bg-yellow-50 border-yellow-200",
  rejeitar: "text-red-700 bg-red-50 border-red-200",
};
const ACTIVITY_TYPES = [
  { value: "ligacao", label: "📞 Ligação", icon: "📞" },
  { value: "whatsapp", label: "💬 WhatsApp", icon: "💬" },
  { value: "email", label: "📧 Email", icon: "📧" },
  { value: "entrevista", label: "🎤 Entrevista", icon: "🎤" },
  { value: "reuniao", label: "🤝 Reunião", icon: "🤝" },
  { value: "anotacao", label: "📝 Anotação", icon: "📝" },
];

interface CandidatoDialogProps {
  candidato: any;
  vagaId: number;
  canWrite: boolean;
  onClose: () => void;
  onMoveStage: (id: number, dir: "forward" | "back") => void;
  onSetRecommendation: (id: number, rec: string) => void;
  onSetInterviewDate: (id: number, date: string) => void;
  onDeleteCandidato: (id: number) => void;
  onUpdate: (updated: any) => void;
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

export function CandidatoDialog({
  candidato, canWrite, onClose, onMoveStage, onSetRecommendation,
  onSetInterviewDate, onDeleteCandidato, onUpdate,
}: CandidatoDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [actType, setActType] = useState("ligacao");
  const [actDesc, setActDesc] = useState("");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: candidato.name ?? "",
    phone: candidato.phone ?? "",
    email: candidato.email ?? "",
    currentRole: candidato.currentRole ?? "",
    source: candidato.source ?? "",
    notes: candidato.notes ?? "",
  });

  const activitiesKey = ["candidato-atividades", candidato.id];

  const { data: atividades = [], isLoading: ativLoading } = useQuery({
    queryKey: activitiesKey,
    queryFn: async () => {
      const r = await fetch(`/api/recruiting/candidatos/${candidato.id}/atividades`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<{ id: number; type: string; description: string | null; createdAt: string }[]>;
    },
  });

  const addAtividade = useMutation({
    mutationFn: async ({ type, description }: { type: string; description: string }) => {
      const r = await fetch(`/api/recruiting/candidatos/${candidato.id}/atividades`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type, description }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: activitiesKey }); setActDesc(""); toast({ title: "Atividade registrada" }); },
    onError: () => toast({ title: "Erro ao registrar", variant: "destructive" }),
  });

  const saveEdit = useMutation({
    mutationFn: async (data: typeof editData) => {
      const r = await fetch(`/api/candidatos/${candidato.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          name: data.name || undefined,
          phone: data.phone || null,
          email: data.email || null,
          currentRole: data.currentRole || null,
          source: data.source || null,
          notes: data.notes || null,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (updated) => {
      onUpdate({ ...candidato, ...updated });
      setEditing(false);
      toast({ title: "Candidato atualizado" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const handleLogActivity = () => {
    if (!actDesc.trim()) return;
    addAtividade.mutate({ type: actType, description: actDesc.trim() });
  };

  const stageIdx = STAGES.indexOf(candidato.stage as Stage);
  const activityTypeIcon = (type: string) => ACTIVITY_TYPES.find((a) => a.value === type)?.icon ?? "📝";
  const displayPhone = editing ? editData.phone : candidato.phone;
  const displayEmail = editing ? editData.email : candidato.email;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between pr-6">
            {editing ? (
              <Input
                className="h-8 text-sm font-semibold flex-1 mr-2"
                value={editData.name}
                onChange={(e) => setEditData(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome"
              />
            ) : (
              <span className="truncate">{candidato.name}</span>
            )}
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {!editing && displayPhone && (
                <a href={whatsappUrl(displayPhone)} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-green-600 border-green-200 hover:bg-green-50">
                    <MessageCircle className="h-3.5 w-3.5" /><span className="text-xs">WhatsApp</span>
                  </Button>
                </a>
              )}
              {!editing && displayEmail && (
                <a href={`mailto:${displayEmail}`}>
                  <Button variant="outline" size="sm" className="h-7 px-2"><Mail className="h-3.5 w-3.5" /></Button>
                </a>
              )}
              {canWrite && !editing && (
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 pr-1">

            {/* Edit mode */}
            {editing ? (
              <div className="space-y-2.5 p-3 rounded-lg bg-muted/40 border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Editar informações</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input className="h-8 text-xs" value={editData.phone} onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))} placeholder="(48) 9xxxx-xxxx" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" className="h-8 text-xs" value={editData.email} onChange={(e) => setEditData(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cargo atual</Label>
                    <Input className="h-8 text-xs" value={editData.currentRole} onChange={(e) => setEditData(p => ({ ...p, currentRole: e.target.value }))} placeholder="Corretor..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Origem</Label>
                    <Input className="h-8 text-xs" value={editData.source} onChange={(e) => setEditData(p => ({ ...p, source: e.target.value }))} placeholder="LinkedIn, Indicação..." />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notas</Label>
                  <Textarea className="text-xs resize-none" rows={3} value={editData.notes} onChange={(e) => setEditData(p => ({ ...p, notes: e.target.value }))} placeholder="Observações, impressões..." />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1" onClick={() => saveEdit.mutate(editData)} disabled={!editData.name.trim() || saveEdit.isPending}>
                    {saveEdit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditData({ name: candidato.name ?? "", phone: candidato.phone ?? "", email: candidato.email ?? "", currentRole: candidato.currentRole ?? "", source: candidato.source ?? "", notes: candidato.notes ?? "" }); }}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              /* Read view */
              <div className="grid grid-cols-2 gap-2 text-sm">
                {candidato.currentRole && (
                  <div><p className="text-xs text-muted-foreground">Cargo atual</p><p className="font-medium text-xs">{candidato.currentRole}</p></div>
                )}
                {candidato.source && (
                  <div><p className="text-xs text-muted-foreground">Origem</p><p className="font-medium text-xs">{candidato.source}</p></div>
                )}
                {candidato.phone && (
                  <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium text-xs">{candidato.phone}</p></div>
                )}
                {candidato.email && (
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="text-xs truncate">{candidato.email}</p></div>
                )}
              </div>
            )}

            {/* Stage + interview date — only show when not editing */}
            {!editing && (
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estágio</p>
                  <Badge className={stageColor[candidato.stage as Stage] || ""}>{stageLabel[candidato.stage as Stage] || candidato.stage}</Badge>
                </div>
                {candidato.stage === "entrevista" && canWrite && (
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Data da entrevista</p>
                    <Input type="datetime-local" className="h-8 text-xs" defaultValue={formatDateInput(candidato.interviewAt)}
                      onChange={(e) => { onSetInterviewDate(candidato.id, e.target.value); onUpdate({ ...candidato, interviewAt: e.target.value }); }} />
                  </div>
                )}
                {candidato.stage === "entrevista" && !canWrite && candidato.interviewAt && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Data da entrevista</p>
                    <p className="text-xs font-medium">{formatDateTime(candidato.interviewAt)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recommendation */}
            {canWrite && !editing && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recomendação</p>
                <div className="flex gap-2">
                  {["avancar", "aguardar", "rejeitar"].map((rec) => (
                    <button key={rec}
                      className={`flex-1 text-xs py-1.5 rounded-md border font-medium transition-all ${candidato.recommendation === rec ? recColor[rec] : "text-muted-foreground border-border hover:border-primary/40"}`}
                      onClick={() => { onSetRecommendation(candidato.id, rec); onUpdate({ ...candidato, recommendation: rec }); }}>
                      {recLabel[rec]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes (read only, when not editing) */}
            {!editing && candidato.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                <p className="text-xs text-muted-foreground italic whitespace-pre-line">{candidato.notes}</p>
              </div>
            )}

            {/* Activity log */}
            {!editing && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico de contatos</p>
                {canWrite && (
                  <div className="flex gap-2 mb-3">
                    <Select value={actType} onValueChange={setActType}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input className="h-8 text-xs flex-1" placeholder="Ex: Ligou às 14h, aguarda retorno..."
                      value={actDesc} onChange={(e) => setActDesc(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleLogActivity(); }} />
                    <Button size="sm" className="h-8 px-2" onClick={handleLogActivity} disabled={!actDesc.trim() || addAtividade.isPending}>
                      {addAtividade.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}
                {ativLoading ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : atividades.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Nenhuma atividade registrada ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {atividades.map((a) => (
                      <div key={a.id} className="flex gap-2.5 items-start">
                        <span className="text-base leading-none mt-0.5">{activityTypeIcon(a.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/90">{a.description || ACTIVITY_TYPES.find(t => t.value === a.type)?.label}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(a.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Bottom actions */}
        {canWrite && !editing && (
          <div className="flex gap-2 pt-3 border-t shrink-0">
            <div className="flex gap-1 flex-1">
              <Button variant="outline" size="sm" className="flex-1" disabled={stageIdx === 0}
                onClick={() => { onMoveStage(candidato.id, "back"); onClose(); }}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />Voltar
              </Button>
              <Button size="sm" className="flex-1" disabled={stageIdx === STAGES.length - 1}
                onClick={() => { onMoveStage(candidato.id, "forward"); onClose(); }}>
                Avançar<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
              onClick={() => onDeleteCandidato(candidato.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
