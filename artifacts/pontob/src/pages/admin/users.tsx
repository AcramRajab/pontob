import { useListUsers, useCreateUser, useUpdateUser, getListUsersQueryKey, getListFranchisesQueryKey, useListFranchises, UserInputRole, UserUpdateRole, useListInvites, useRevokeInvite, useApproveInvite, useRejectInvite, getListInvitesQueryKey, InviteTokenStatus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Eye, EyeOff, MailCheck, Clock, Send, Link2, Copy, Check, Mail, ShieldX, CheckCircle2, XCircle, AlertCircle, UserCheck, UserX, Hourglass, Filter, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

const roleLabel: Record<string, string> = {
  master_admin: "Admin Master",
  staff_regional: "Equipe Regional",
  franqueado: "Franqueado",
  responsavel_interno: "Responsável Interno",
};

const roleBadgeColor: Record<string, string> = {
  master_admin: "bg-red-100 text-red-700 border-red-200",
  staff_regional: "bg-orange-100 text-orange-700 border-orange-200",
  franqueado: "bg-blue-100 text-blue-700 border-blue-200",
  responsavel_interno: "bg-slate-100 text-slate-600 border-slate-200",
};

const INVITATION_ROLES = ["franqueado", "responsavel_interno", "staff_regional"];

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  franchiseId: string;
}

interface GeneratedInvite {
  link: string;
  franchiseName: string;
  role: string;
}

function InviteStatusBadge({ user }: { user: any }) {
  if (!INVITATION_ROLES.includes(user.role)) return null;
  if (user.lastLoginAt) {
    return (
      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 gap-1">
        <MailCheck className="h-3 w-3" />
        Ativo
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 gap-1">
      <Clock className="h-3 w-3" />
      Aguardando
    </Badge>
  );
}

const EXPIRY_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
  { value: 90, label: "90 dias" },
];

interface GeneratedInviteWithExpiry extends GeneratedInvite {
  expiresInDays: number;
  expiresAt: string;
}

function InviteLinkDialog({ franchises, onGenerated }: { franchises: any[]; onGenerated?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<GeneratedInviteWithExpiry | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteRole, setInviteRole] = useState("franqueado");
  const [inviteFranchise, setInviteFranchise] = useState<string>("");
  const [inviteExpiry, setInviteExpiry] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setGenerated(null);
      setCopied(false);
      setInviteRole("franqueado");
      setInviteFranchise("");
      setInviteExpiry(30);
    }
  };

  const generate = async () => {
    if (!inviteFranchise) {
      toast({ title: "Selecione uma franquia", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ franchiseId: parseInt(inviteFranchise), role: inviteRole, expiresInDays: inviteExpiry }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar convite");
      setGenerated({ link: data.link, franchiseName: data.franchiseName, role: data.role, expiresInDays: inviteExpiry, expiresAt: data.expiresAt });
      onGenerated?.();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generated) return;
    navigator.clipboard.writeText(generated.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = () => {
    if (!generated) return;
    const expiryLabel = EXPIRY_OPTIONS.find(o => o.value === generated.expiresInDays)?.label ?? `${generated.expiresInDays} dias`;
    const text = `Olá! Você foi convidado para acessar a plataforma Método Ponto B.\n\nFranquia: ${generated.franchiseName}\nAcesso: ${roleLabel[generated.role] ?? generated.role}\n\nClique no link abaixo para criar sua conta:\n${generated.link}\n\nO link é válido por ${expiryLabel}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-generate-invite">
          <Link2 className="h-4 w-4 mr-1.5" /> Gerar link de convite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar link de convite</DialogTitle>
        </DialogHeader>
        {!generated ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Gere um link único para que um responsável ou franqueado crie sua própria conta.
            </p>
            <div className="space-y-1.5">
              <Label>Franquia *</Label>
              <Select value={inviteFranchise} onValueChange={setInviteFranchise}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a franquia" />
                </SelectTrigger>
                <SelectContent>
                  {franchises.map((f: any) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de acesso *</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="franqueado">Franqueado — acesso completo (pode editar)</SelectItem>
                  <SelectItem value="responsavel_interno">Responsável Interno — somente visualização</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Validade do link *</Label>
              <Select value={String(inviteExpiry)} onValueChange={v => setInviteExpiry(parseInt(v))}>
                <SelectTrigger data-testid="select-invite-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => handleOpen(false)}>Cancelar</Button>
              <Button onClick={generate} disabled={loading || !inviteFranchise}>
                {loading ? "Gerando..." : "Gerar link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1">
              <p className="text-sm font-medium text-green-800">Link gerado com sucesso!</p>
              <p className="text-xs text-green-700">
                Franquia: <strong>{generated.franchiseName}</strong> · Acesso: <strong>{roleLabel[generated.role] ?? generated.role}</strong>
              </p>
              <p className="text-xs text-green-600">
                Válido por {EXPIRY_OPTIONS.find(o => o.value === generated.expiresInDays)?.label ?? `${generated.expiresInDays} dias`} · Expira em {new Date(generated.expiresAt).toLocaleDateString("pt-BR")} · Uso único
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Link de cadastro</Label>
              <div className="flex gap-2">
                <Input value={generated.link} readOnly className="text-xs font-mono" />
                <Button size="icon" variant="outline" onClick={handleCopy} title="Copiar link">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copied ? <><Check className="h-4 w-4 mr-1.5 text-green-600" /> Copiado!</> : <><Copy className="h-4 w-4 mr-1.5" /> Copiar link</>}
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleWhatsApp}>
                WhatsApp
              </Button>
            </div>
            <Button variant="ghost" className="w-full text-sm" onClick={() => { setGenerated(null); setCopied(false); }}>
              Gerar novo link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteStatusPill({ status }: { status: string }) {
  if (status === InviteTokenStatus.pending) {
    return (
      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <AlertCircle className="h-3 w-3" />
        Pendente
      </Badge>
    );
  }
  if (status === InviteTokenStatus.used) {
    return (
      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Utilizado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200 gap-1">
      <XCircle className="h-3 w-3" />
      Expirado
    </Badge>
  );
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return "há 1 mês";
  return `há ${months} meses`;
}

function PendingApprovalSection({ invites }: { invites: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [approveTarget, setApproveTarget] = useState<{ id: number; name: string; email: string; franchiseName: string | null; role: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: number; name: string; franchiseName: string | null; role: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filterFranchise, setFilterFranchise] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("oldest");

  const pending = invites.filter(
    (inv) => inv.status === InviteTokenStatus.used && !inv.approvedAt && !inv.rejectedAt,
  );

  const franchiseOptions = [...new Set(pending.map((inv) => inv.franchiseName).filter(Boolean))] as string[];
  const roleOptions = [...new Set(pending.map((inv) => inv.role).filter(Boolean))] as string[];

  const displayed = pending
    .filter((inv) => filterFranchise === "all" || inv.franchiseName === filterFranchise)
    .filter((inv) => filterRole === "all" || inv.role === filterRole)
    .sort((a, b) => {
      const ta = a.usedAt ? new Date(a.usedAt).getTime() : 0;
      const tb = b.usedAt ? new Date(b.usedAt).getTime() : 0;
      return sortOrder === "oldest" ? ta - tb : tb - ta;
    });

  const approve = useApproveInvite({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListInvitesQueryKey() });
        qc.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
        toast({ title: "Usuário aprovado com sucesso", description: "O acesso foi liberado e um e-mail de boas-vindas foi enviado." });
        setApproveTarget(null);
      },
      onError: (err: any) => {
        toast({ title: err?.message ?? "Erro ao aprovar usuário", variant: "destructive" });
        setApproveTarget(null);
      },
    },
  });

  const reject = useRejectInvite({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListInvitesQueryKey() });
        qc.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
        toast({ title: "Cadastro rejeitado", description: "O usuário foi removido permanentemente." });
        setRejectTarget(null);
        setRejectReason("");
      },
      onError: (err: any) => {
        toast({ title: err?.message ?? "Erro ao rejeitar usuário", variant: "destructive" });
        setRejectTarget(null);
        setRejectReason("");
      },
    },
  });

  if (pending.length === 0) return null;

  const hasFilters = filterFranchise !== "all" || filterRole !== "all";

  return (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              Aguardando aprovação ({hasFilters ? `${displayed.length} de ${pending.length}` : pending.length})
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <Select value={filterFranchise} onValueChange={setFilterFranchise}>
                <SelectTrigger
                  className="h-7 text-xs bg-white border-amber-200 text-amber-900 min-w-[140px]"
                  data-testid="select-filter-franchise"
                >
                  <SelectValue placeholder="Todas as franquias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as franquias</SelectItem>
                  {franchiseOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger
                className="h-7 text-xs bg-white border-amber-200 text-amber-900 min-w-[140px]"
                data-testid="select-filter-role"
              >
                <SelectValue placeholder="Todos os perfis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>{roleLabel[role] ?? role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger
                  className="h-7 text-xs bg-white border-amber-200 text-amber-900 min-w-[120px]"
                  data-testid="select-sort-order"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oldest">Mais antigos primeiro</SelectItem>
                  <SelectItem value="newest">Mais recentes primeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {displayed.length === 0 && (
          <p className="text-sm text-amber-700/70 text-center py-2">
            Nenhum cadastro corresponde aos filtros selecionados.
          </p>
        )}
        <div className="space-y-2">
          {displayed.map((inv) => (
            <div
              key={inv.id}
              data-testid={`card-pending-approval-${inv.id}`}
              className="flex items-center justify-between gap-3 rounded-md bg-white border border-amber-100 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm shrink-0">
                  {(inv.usedByUserName ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{inv.usedByUserName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inv.usedByUserEmail ?? ""}
                    {inv.franchiseName && (
                      <span className="ml-2 text-muted-foreground/70">— {inv.franchiseName}</span>
                    )}
                    <span className="ml-2">· {roleLabel[inv.role] ?? inv.role}</span>
                  </p>
                  {inv.usedAt && (
                    <p className="text-xs text-amber-600/80 mt-0.5">
                      Cadastrado {relativeTime(inv.usedAt)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800"
                  onClick={() => setApproveTarget({ id: inv.id, name: inv.usedByUserName ?? "—", email: inv.usedByUserEmail ?? "", franchiseName: inv.franchiseName ?? null, role: inv.role })}
                  data-testid={`button-approve-${inv.id}`}
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setRejectTarget({ id: inv.id, name: inv.usedByUserName ?? "—", franchiseName: inv.franchiseName ?? null, role: inv.role })}
                  data-testid={`button-reject-${inv.id}`}
                >
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Rejeitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!approveTarget} onOpenChange={v => { if (!v) setApproveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{approveTarget?.name}</strong> ({approveTarget?.email}) da franquia{" "}
              <strong>{approveTarget?.franchiseName ?? "—"}</strong> receberá acesso imediato à plataforma.
              Um e-mail de boas-vindas será enviado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => approveTarget && approve.mutate({ id: approveTarget.id })}
              disabled={approve.isPending}
            >
              {approve.isPending ? "Aprovando..." : "Aprovar acesso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={v => { if (!v) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar cadastro?</DialogTitle>
            <DialogDescription>
              O cadastro de <strong>{rejectTarget?.name}</strong> da franquia{" "}
              <strong>{rejectTarget?.franchiseName ?? "—"}</strong> será <strong>removido permanentemente</strong>.
              O usuário não terá acesso à plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Motivo da rejeição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              id="reject-reason"
              data-testid="textarea-reject-reason"
              placeholder="Ex: Franquia já possui responsável cadastrado, e-mail não reconhecido..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">Se informado, o motivo será incluído no e-mail de notificação enviado ao usuário.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancelar</Button>
            <Button
              variant="destructive"
              data-testid="button-confirm-reject"
              onClick={() => rejectTarget && reject.mutate({ id: rejectTarget.id, data: { reason: rejectReason.trim() || undefined } })}
              disabled={reject.isPending}
            >
              {reject.isPending ? "Rejeitando..." : "Rejeitar cadastro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConvitesSection({ franchises }: { franchises: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [revokeTarget, setRevokeTarget] = useState<{ id: number; franchiseName: string | null; role: string } | null>(null);

  const { data: invites = [], isLoading } = useListInvites({
    query: { queryKey: getListInvitesQueryKey(), enabled: true },
  });

  const revoke = useRevokeInvite({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListInvitesQueryKey() });
        toast({ title: "Convite revogado com sucesso" });
        setRevokeTarget(null);
      },
      onError: (err: any) => {
        toast({ title: err?.message ?? "Erro ao revogar convite", variant: "destructive" });
        setRevokeTarget(null);
      },
    },
  });

  const pendingCount = invites.filter(i => i.status === InviteTokenStatus.pending).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} convite${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""} aguardando uso`
              : "Nenhum convite pendente"}
          </p>
        </div>
        <InviteLinkDialog
          franchises={franchises}
          onGenerated={() => qc.invalidateQueries({ queryKey: getListInvitesQueryKey() })}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : invites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">Nenhum convite gerado</p>
            <p className="text-sm text-muted-foreground mt-1">Gere um link de convite para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invites.map((inv) => {
            const expiresAt = new Date(inv.expiresAt);
            const createdAt = new Date(inv.createdAt);
            const isPending = inv.status === InviteTokenStatus.pending;
            return (
              <Card key={inv.id} data-testid={`card-invite-${inv.id}`} className={inv.status !== InviteTokenStatus.pending ? "opacity-60" : ""}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {inv.franchiseName ?? "—"}
                          <span className="ml-2 font-normal text-muted-foreground">·</span>
                          <span className="ml-2 font-normal text-muted-foreground">{roleLabel[inv.role] ?? inv.role}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {inv.status === InviteTokenStatus.used && inv.usedByUserName ? (
                            <>Usado por <strong>{inv.usedByUserName}</strong>{inv.usedByUserEmail ? ` (${inv.usedByUserEmail})` : ""}</>
                          ) : inv.status === InviteTokenStatus.expired ? (
                            <>Expirou em {expiresAt.toLocaleDateString("pt-BR")}</>
                          ) : (
                            <>Expira em {expiresAt.toLocaleDateString("pt-BR")} · Gerado em {createdAt.toLocaleDateString("pt-BR")}</>
                          )}
                        </p>
                        {inv.status === InviteTokenStatus.pending && inv.openedAt && (
                          <p className="text-xs text-amber-600 truncate">
                            Aberto em {new Date(inv.openedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <InviteStatusPill status={inv.status} />
                      {isPending && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRevokeTarget({ id: inv.id, franchiseName: inv.franchiseName ?? null, role: inv.role })}
                          data-testid={`button-revoke-invite-${inv.id}`}
                          title="Revogar convite"
                        >
                          <ShieldX className="h-3.5 w-3.5 mr-1" />
                          Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!revokeTarget} onOpenChange={v => { if (!v) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O link de convite para <strong>{revokeTarget?.franchiseName ?? "—"}</strong>{" "}
              ({roleLabel[revokeTarget?.role ?? ""] ?? revokeTarget?.role}) será excluído permanentemente
              e não poderá mais ser utilizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => revokeTarget && revoke.mutate({ id: revokeTarget.id })}
              disabled={revoke.isPending}
            >
              {revoke.isPending ? "Revogando..." : "Revogar convite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [resendTarget, setResendTarget] = useState<{ id: number; name: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "invites">("users");

  const { data: users = [], isLoading } = useListUsers({}, { query: { enabled: true, queryKey: getListUsersQueryKey({}) } });
  const { data: franchises = [] } = useListFranchises({ query: { enabled: true, queryKey: getListFranchisesQueryKey() } });
  const { data: invites = [] } = useListInvites({ query: { queryKey: getListInvitesQueryKey(), enabled: true } });
  const create = useCreateUser();
  const update = useUpdateUser();

  const pendingInviteCount = invites.filter(i => i.status === InviteTokenStatus.pending).length;
  const pendingApprovalCount = invites.filter(i => i.status === InviteTokenStatus.used && !i.approvedAt && !i.rejectedAt).length;

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao excluir usuário");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
      toast({ title: "Usuário excluído com sucesso" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const resendInvite = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}/resend-invite`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao reenviar convite");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
      toast({ title: "Convite reenviado", description: "Uma nova senha temporária foi enviada por e-mail." });
      setResendTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
      setResendTarget(null);
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<UserForm>({
    defaultValues: { role: "responsavel_interno", franchiseId: "none" },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setShowPass(false);
    reset({ role: "responsavel_interno", franchiseId: "none", name: "", email: "", password: "" });
  };

  const onSubmit = async (data: UserForm) => {
    try {
      const franchiseId = data.franchiseId && data.franchiseId !== "none" ? parseInt(data.franchiseId) : undefined;
      if (editId) {
        const payload: Record<string, unknown> = {
          name: data.name,
          email: data.email,
          role: data.role as typeof UserUpdateRole[keyof typeof UserUpdateRole],
          franchiseId,
        };
        if (data.password) payload.password = data.password;
        await update.mutateAsync({ id: editId, data: payload as Parameters<typeof update.mutateAsync>[0]["data"] });
        toast({ title: "Usuário atualizado com sucesso" });
      } else {
        await create.mutateAsync({
          data: {
            name: data.name,
            email: data.email,
            role: data.role as typeof UserInputRole[keyof typeof UserInputRole],
            franchiseId,
            password: data.password,
          },
        });
        toast({
          title: "Usuário criado com sucesso",
          description: INVITATION_ROLES.includes(data.role)
            ? "Um e-mail de boas-vindas com as credenciais foi enviado."
            : undefined,
        });
      }
      qc.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
      closeDialog();
    } catch {
      toast({ title: "Erro ao salvar usuário", variant: "destructive" });
    }
  };

  const handleEdit = (u: any) => {
    setEditId(u.id);
    setShowPass(false);
    reset({
      name: u.name,
      email: u.email,
      role: u.role,
      franchiseId: u.franchiseId ? String(u.franchiseId) : "none",
      password: "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gestão de usuários e permissões</p>
        </div>
        {activeTab === "users" && (
          <div className="flex gap-2 flex-wrap">
            <InviteLinkDialog
              franchises={franchises}
              onGenerated={() => qc.invalidateQueries({ queryKey: getListInvitesQueryKey() })}
            />
            <Dialog open={open} onOpenChange={v => { if (!v) closeDialog(); else setOpen(true); }}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-user" onClick={() => { reset({ role: "responsavel_interno", franchiseId: "none" }); setEditId(null); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1.5" /> Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-1">
                  <div className="space-y-1.5">
                    <Label>Nome completo *</Label>
                    <Input
                      {...register("name", { required: "Campo obrigatório" })}
                      placeholder="Ex: João Silva"
                      data-testid="input-name"
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>E-mail *</Label>
                    <Input
                      type="email"
                      {...register("email", { required: "Campo obrigatório" })}
                      placeholder="joao@exemplo.com.br"
                      data-testid="input-email"
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>{editId ? "Nova Senha" : "Senha *"}</Label>
                    <div className="relative">
                      <Input
                        type={showPass ? "text" : "password"}
                        {...register("password", {
                          required: editId ? false : "Campo obrigatório",
                          minLength: { value: 6, message: "Mínimo 6 caracteres" },
                        })}
                        placeholder={editId ? "Deixe em branco para manter a atual" : "Mínimo 6 caracteres"}
                        data-testid="input-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPass(p => !p)}
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                    {editId ? (
                      <p className="text-xs text-muted-foreground">Preencha somente se quiser redefinir a senha deste usuário.</p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Perfil *</Label>
                    <Controller
                      name="role"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Selecione o perfil" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleLabel).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.role && <p className="text-xs text-destructive">Campo obrigatório</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Franquia</Label>
                    <Controller
                      name="franchiseId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || "none"} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-franchise">
                            <SelectValue placeholder="Sem franquia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem franquia</SelectItem>
                            {franchises.map((f: any) => (
                              <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button variant="outline" type="button" onClick={closeDialog}>Cancelar</Button>
                    <Button type="submit" disabled={create.isPending || update.isPending} data-testid="button-save">
                      {create.isPending || update.isPending ? "Salvando..." : editId ? "Salvar alterações" : "Criar usuário"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-users"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
            {pendingApprovalCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                {pendingApprovalCount}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "invites"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-invites"
        >
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Convites
            {pendingInviteCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                {pendingInviteCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {activeTab === "invites" ? (
        <ConvitesSection franchises={franchises} />
      ) : (
        <>
          <PendingApprovalSection invites={invites} />
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : users.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-medium">Nenhum usuário cadastrado</p>
                <p className="text-sm text-muted-foreground mt-1">Clique em "Novo Usuário" para começar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {users.map((u: any) => (
                <Card key={u.id} data-testid={`card-user-${u.id}`} className={!u.active ? "opacity-50" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.email}
                            {u.franchiseName && <span className="ml-2 text-muted-foreground/70">— {u.franchiseName}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Badge className={`text-xs border ${roleBadgeColor[u.role] || ""}`} variant="outline">
                          {roleLabel[u.role] || u.role}
                        </Badge>
                        <InviteStatusBadge user={u} />
                        {!u.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                        {INVITATION_ROLES.includes(u.role) && !u.lastLoginAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => setResendTarget({ id: u.id, name: u.name, email: u.email })}
                            data-testid={`button-resend-${u.id}`}
                            title="Reenviar convite"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Reenviar convite
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(u)} data-testid={`button-edit-${u.id}`}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                          data-testid={`button-delete-${u.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
                  disabled={deleteUser.isPending}
                >
                  {deleteUser.isPending ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!resendTarget} onOpenChange={v => { if (!v) setResendTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reenviar convite?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai gerar uma <strong>nova senha temporária</strong> e enviá-la por e-mail para{" "}
                  <strong>{resendTarget?.name}</strong> ({resendTarget?.email}).
                  A senha atual deste usuário será substituída.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => resendTarget && resendInvite.mutate(resendTarget.id)}
                  disabled={resendInvite.isPending}
                >
                  {resendInvite.isPending ? "Enviando..." : "Reenviar convite"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
