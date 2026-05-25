import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, Phone, Mail, MessageCircle, Pencil, Check, X,
  Video, Users, CheckCircle2, XCircle, Clock, Trash2, Loader2
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const resultadoConfig: Record<string, { label: string; color: string }> = {
  aprovado: { label: "Aprovado", color: "text-green-700 border-green-200 bg-green-50" },
  reprovado: { label: "Reprovado", color: "text-red-700 border-red-200 bg-red-50" },
};

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CandidatoDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const candidatoId = parseInt(params.id ?? "0");

  const { data: candidato, isLoading } = useQuery<any>({
    queryKey: ["candidato", candidatoId],
    queryFn: async () => {
      const res = await fetch(`/api/candidatos/${candidatoId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!candidatoId,
  });

  const [editData, setEditData] = useState<any>({});

  const canWrite = user?.role !== "responsavel_interno";

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/candidatos/${candidatoId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (updated) => {
      qc.setQueryData(["candidato", candidatoId], updated);
      qc.invalidateQueries({ queryKey: ["recruiting-candidatos"] });
      setEditing(false);
      toast({ title: "Candidato atualizado" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/candidatos/${candidatoId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recruiting-candidatos"] });
      toast({ title: "Candidato excluído" });
      navigate("/recrutamento");
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidato) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Candidato não encontrado.</p>
        <Button className="mt-4" onClick={() => navigate("/recrutamento")}>Voltar</Button>
      </div>
    );
  }

  const resultado = candidato.resultadoFinal ? resultadoConfig[candidato.resultadoFinal] : null;

  function startEdit() {
    setEditData({
      name: candidato.name ?? "",
      phone: candidato.phone ?? "",
      email: candidato.email ?? "",
      notasEntrevistaOnline: candidato.notasEntrevistaOnline ?? "",
      notasEntrevistaPresencial: candidato.notasEntrevistaPresencial ?? "",
      resultadoFinal: candidato.resultadoFinal ?? "pendente",
    });
    setEditing(true);
  }

  function saveEdit() {
    saveMutation.mutate({
      name: editData.name || undefined,
      phone: editData.phone || null,
      email: editData.email || null,
      notasEntrevistaOnline: editData.notasEntrevistaOnline || null,
      notasEntrevistaPresencial: editData.notasEntrevistaPresencial || null,
      resultadoFinal: editData.resultadoFinal === "pendente" ? null : editData.resultadoFinal,
    });
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/recrutamento")} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {editing ? (
                <Input
                  className="h-8 text-base font-bold"
                  value={editData.name}
                  onChange={(e) => setEditData((p: any) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome completo"
                />
              ) : (
                candidato.name
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {resultado ? (
                <Badge variant="outline" className={cn("text-xs", resultado.color)}>
                  {candidato.resultadoFinal === "aprovado" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {resultado.label}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
                  <Clock className="h-3 w-3 mr-1" />Em avaliação
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">Cadastrado em {formatDate(candidato.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!editing && candidato.phone && (
            <a href={whatsappUrl(candidato.phone)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5 text-green-600 border-green-200 hover:bg-green-50">
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">WhatsApp</span>
              </Button>
            </a>
          )}
          {!editing && candidato.email && (
            <a href={`mailto:${candidato.email}`}>
              <Button variant="outline" size="sm" className="h-8 px-2.5">
                <Mail className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
          {canWrite && !editing && (
            <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canWrite && !editing && (
            <Button
              variant="ghost" size="sm"
              className="h-8 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Contact info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone / WhatsApp</Label>
                <Input
                  className="h-8 text-xs"
                  value={editData.phone}
                  onChange={(e) => setEditData((p: any) => ({ ...p, phone: e.target.value }))}
                  placeholder="(48) 9xxxx-xxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  className="h-8 text-xs"
                  value={editData.email}
                  onChange={(e) => setEditData((p: any) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 text-sm">
              {candidato.phone ? (
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium text-sm">{candidato.phone}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Telefone não informado</p>
              )}
              {candidato.email && (
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="font-medium text-sm">{candidato.email}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entrevista Online */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Entrevista Online
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              rows={4}
              className="text-xs resize-none"
              value={editData.notasEntrevistaOnline}
              onChange={(e) => setEditData((p: any) => ({ ...p, notasEntrevistaOnline: e.target.value }))}
              placeholder="Observações sobre a entrevista online..."
            />
          ) : candidato.notasEntrevistaOnline ? (
            <p className="text-sm whitespace-pre-line">{candidato.notasEntrevistaOnline}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma observação registrada.</p>
          )}
        </CardContent>
      </Card>

      {/* Entrevista Presencial */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Entrevista Presencial
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              rows={4}
              className="text-xs resize-none"
              value={editData.notasEntrevistaPresencial}
              onChange={(e) => setEditData((p: any) => ({ ...p, notasEntrevistaPresencial: e.target.value }))}
              placeholder="Observações sobre a entrevista presencial..."
            />
          ) : candidato.notasEntrevistaPresencial ? (
            <p className="text-sm whitespace-pre-line">{candidato.notasEntrevistaPresencial}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma observação registrada.</p>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Resultado da Seleção
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Select
              value={editData.resultadoFinal}
              onValueChange={(v) => setEditData((p: any) => ({ ...p, resultadoFinal: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">⏳ Pendente — ainda em avaliação</SelectItem>
                <SelectItem value="aprovado">✅ Aprovado para a próxima etapa</SelectItem>
                <SelectItem value="reprovado">❌ Reprovado — não avançou</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              {resultado ? (
                <>
                  {candidato.resultadoFinal === "aprovado" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={cn("font-semibold text-sm", candidato.resultadoFinal === "aprovado" ? "text-green-700" : "text-red-700")}>
                    {resultado.label}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-sm text-amber-700">Em avaliação</span>
                </>
              )}
            </div>
          )}

          {/* Edit-mode quick result buttons when not in full edit mode */}
          {!editing && canWrite && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant={candidato.resultadoFinal === "aprovado" ? "default" : "outline"}
                className={cn("flex-1 gap-1.5 h-8 text-xs", candidato.resultadoFinal === "aprovado" ? "bg-green-600 hover:bg-green-700" : "text-green-700 border-green-200 hover:bg-green-50")}
                onClick={() => saveMutation.mutate({ resultadoFinal: candidato.resultadoFinal === "aprovado" ? null : "aprovado" })}
                disabled={saveMutation.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprovado
              </Button>
              <Button
                size="sm"
                variant={candidato.resultadoFinal === "reprovado" ? "default" : "outline"}
                className={cn("flex-1 gap-1.5 h-8 text-xs", candidato.resultadoFinal === "reprovado" ? "bg-red-600 hover:bg-red-700" : "text-red-700 border-red-200 hover:bg-red-50")}
                onClick={() => saveMutation.mutate({ resultadoFinal: candidato.resultadoFinal === "reprovado" ? null : "reprovado" })}
                disabled={saveMutation.isPending}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reprovado
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit actions */}
      {editing && (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={saveEdit}
            disabled={!editData.name?.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Salvar alterações
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditing(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir candidato?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{candidato.name}</strong> será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => { setConfirmDelete(false); deleteMutation.mutate(); }}
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
