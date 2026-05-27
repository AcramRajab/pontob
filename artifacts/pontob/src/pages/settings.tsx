import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ptBR } from "date-fns/locale";

const PAUSE_KEY = "pontob_notif_pause_until";

const roleLabel: Record<string, string> = {
  master_admin: "Admin Master",
  staff_regional: "Equipe Regional",
  franqueado: "Franqueado",
  responsavel_interno: "Responsável Interno",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function offsetDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

function formatDateDisplay(dateStr: string): string {
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function pauseLabel(dateStr: string): string {
  const tomorrow = offsetDateStr(1);
  const in3Days = offsetDateStr(3);
  const in7Days = offsetDateStr(7);
  const in14Days = offsetDateStr(14);
  if (dateStr === tomorrow) return "Retoma amanhã";
  if (dateStr === in3Days) return `Pausado por 3 dias — retoma em ${formatDateDisplay(dateStr)}`;
  if (dateStr === in7Days) return `Pausado por 1 semana — retoma em ${formatDateDisplay(dateStr)}`;
  if (dateStr === in14Days) return `Pausado por 2 semanas — retoma em ${formatDateDisplay(dateStr)}`;
  return `Retoma em ${formatDateDisplay(dateStr)}`;
}

// ─── Pause localStorage hook ──────────────────────────────────────────────────

function usePauseUntil() {
  const [pauseUntil, setPauseUntilState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PAUSE_KEY);
    if (!stored) return;
    const today = toDateString(new Date());
    if (stored >= today) {
      setPauseUntilState(stored);
    } else {
      localStorage.removeItem(PAUSE_KEY);
    }
  }, []);

  function setPauseUntil(dateStr: string | null) {
    const today = toDateString(new Date());
    const effective = dateStr && dateStr >= today ? dateStr : null;
    setPauseUntilState(effective);
    if (effective) {
      localStorage.setItem(PAUSE_KEY, effective);
    } else {
      localStorage.removeItem(PAUSE_KEY);
    }
  }

  return { pauseUntil, setPauseUntil };
}

// ─── Quick picks ──────────────────────────────────────────────────────────────

const QUICK_PICKS = [
  { label: "Amanhã", sublabel: () => formatDateDisplay(offsetDateStr(1)), days: 1 },
  { label: "Próximos 3 dias", sublabel: () => formatDateDisplay(offsetDateStr(3)), days: 3 },
  { label: "1 semana", sublabel: () => formatDateDisplay(offsetDateStr(7)), days: 7 },
  { label: "2 semanas", sublabel: () => formatDateDisplay(offsetDateStr(14)), days: 14 },
];

// ─── Pause picker dialog ──────────────────────────────────────────────────────

function PausePickerDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (dateStr: string) => void;
}) {
  const [view, setView] = useState<"quick" | "custom">("quick");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onClose();
      setView("quick");
      setCustomDate(undefined);
    }
  }

  function handleQuickPick(days: number) {
    onConfirm(offsetDateStr(days));
    setView("quick");
    setCustomDate(undefined);
  }

  function handleCustomConfirm() {
    if (customDate) {
      onConfirm(toDateString(customDate));
      setView("quick");
      setCustomDate(undefined);
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        {view === "quick" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary" />
                Pausar lembretes
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-1">
              Os lembretes diários serão retomados automaticamente na data
              escolhida. Alertas continuam ativos.
            </p>

            <div className="divide-y rounded-lg border overflow-hidden">
              {QUICK_PICKS.map((q) => (
                <button
                  key={q.days}
                  type="button"
                  onClick={() => handleQuickPick(q.days)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{q.label}</p>
                    <p className="text-xs text-muted-foreground">{q.sublabel()}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => setView("custom")}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">Data personalizada</p>
                  <p className="text-xs text-muted-foreground">Escolha uma data</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            </div>

            <Button variant="outline" onClick={onClose} className="w-full">
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setView("quick"); setCustomDate(undefined); }}
                  className="hover:text-foreground text-muted-foreground transition-colors"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Escolher data
              </DialogTitle>
            </DialogHeader>

            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={customDate}
                onSelect={setCustomDate}
                disabled={(date) => date < tomorrow}
                locale={ptBR}
                initialFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setView("quick"); setCustomDate(undefined); }}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!customDate}
                onClick={handleCustomConfirm}
              >
                Confirmar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { pauseUntil, setPauseUntil } = usePauseUntil();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPausePicker, setShowPausePicker] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "A nova senha deve ter pelo menos 8 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast({ title: (err as { error?: string }).error || "Senha atual incorreta", variant: "destructive" });
        return;
      }
      toast({ title: "Senha alterada com sucesso" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({ title: "Erro ao alterar senha", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  function handlePauseConfirm(dateStr: string) {
    setPauseUntil(dateStr);
    setShowPausePicker(false);
    toast({ title: `Lembretes pausados até ${formatDateDisplay(dateStr)}` });
  }

  function handleResume() {
    setPauseUntil(null);
    toast({ title: "Lembretes reativados" });
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Informações da sua conta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Nome</span>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Perfil</span>
            <Badge variant="outline">{roleLabel[user?.role ?? ""] || user?.role}</Badge>
          </div>
          {user?.franchiseName && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Franquia</span>
              <span className="text-sm font-medium">{user.franchiseName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Lembretes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pauseUntil ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Lembretes pausados</p>
                <p className="text-xs text-primary mt-0.5">{pauseLabel(pauseUntil)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleResume} className="flex-shrink-0">
                Retomar agora
              </Button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Pausar lembretes</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Suspenda os lembretes diários por um período. Alertas continuam ativos.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPausePicker(true)}
                className="flex-shrink-0"
              >
                Pausar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Alterar senha</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Senha atual</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-9"
                />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrent(v => !v)}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="pr-9"
                />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNew(v => !v)}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="repita a nova senha"
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={saving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={logout} className="w-full" data-testid="button-logout">
        <LogOut className="h-4 w-4 mr-2" />
        Sair da conta
      </Button>

      <PausePickerDialog
        open={showPausePicker}
        onClose={() => setShowPausePicker(false)}
        onConfirm={handlePauseConfirm}
      />
    </div>
  );
}
