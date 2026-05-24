import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, CheckCircle2, Building2, Share2, Copy, Check } from "lucide-react";

type Franchise = { id: number; name: string };

const ROLE_OPTIONS = [
  { value: "franqueado", label: "Franqueado(a)" },
  { value: "broker", label: "Broker / Corretor" },
  { value: "staff", label: "Staff / Equipe Interna" },
];

function getAppUrl(): string {
  return window.location.origin + (import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "");
}

export default function SolicitarAcesso() {
  const [, setLocation] = useLocation();

  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loadingFranchises, setLoadingFranchises] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [franchiseId, setFranchiseId] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/franchises/public")
      .then(r => r.json())
      .then(data => setFranchises(Array.isArray(data) ? data : []))
      .catch(() => setFranchises([]))
      .finally(() => setLoadingFranchises(false));
  }, []);

  const shareUrl = getAppUrl() + "/solicitar-acesso";
  const whatsappText = encodeURIComponent(
    `Olá! Você foi convidado(a) para acessar o *Método Ponto B* — plataforma de execução estratégica da RE/MAX SC.\n\nCadastre-se agora pelo link abaixo e aguarde a liberação de acesso:\n${shareUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!franchiseId) {
      setError("Selecione sua franquia.");
      return;
    }
    if (!roleLabel) {
      setError("Selecione seu cargo.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trial-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password, franchiseId, roleLabel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao enviar cadastro.");
        return;
      }
      setPendingApproval(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold">Solicitação enviada!</h2>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Sua solicitação foi enviada para aprovação da equipe RE/MAX SC.
              </p>
              <p className="text-sm text-muted-foreground">
                Você receberá um <strong>e-mail</strong> assim que seu acesso for liberado.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 text-left space-y-1">
              <p className="font-semibold">O que acontece agora?</p>
              <p>1. A equipe RE/MAX SC recebe sua solicitação por e-mail</p>
              <p>2. Eles verificam e clicam em "Aprovar acesso"</p>
              <p>3. Você recebe um e-mail e já pode fazer login</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/login")} className="w-full">
              Ir para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">

        <Card className="border-dashed border-green-300 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5" />
              Compartilhar este link
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="text-xs h-8 bg-white dark:bg-background"
              />
              <Button size="sm" variant="outline" className="h-8 px-2 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-green-500 hover:bg-green-600 text-white shrink-0 no-underline"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Solicitar acesso ao trial</CardTitle>
            <CardDescription className="mt-1">
              Método Ponto B — RE/MAX Santa Catarina
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Franquia *</Label>
                {loadingFranchises ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground h-9">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando franquias...
                  </div>
                ) : (
                  <Select value={franchiseId} onValueChange={setFranchiseId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione sua franquia" />
                    </SelectTrigger>
                    <SelectContent>
                      {franchises.map(f => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Cargo *</Label>
                <Select value={roleLabel} onValueChange={setRoleLabel} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                <Input
                  id="confirmPassword"
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando solicitação...
                  </>
                ) : "Solicitar acesso ao trial"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Já tem uma conta?{" "}
                <button type="button" className="underline hover:text-foreground" onClick={() => setLocation("/login")}>
                  Fazer login
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
