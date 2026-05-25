import { useAuth } from "@/lib/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Phone, Clock } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

export default function Login() {
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [loginError, setLoginError] = useState<{ type: "invalid" | "pending" | "generic"; message?: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const rawRedirect = new URLSearchParams(window.location.search).get("redirect") ?? "";
  const redirectTo = rawRedirect.startsWith("/") ? rawRedirect : "/today";

  useEffect(() => {
    if (user) {
      setLocation(redirectTo);
    }
  }, [user, setLocation, redirectTo]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    try {
      await login(values);
    } catch (error: any) {
      const data = error?.data ?? error?.response ?? null;
      if (data?.error === "pending_approval") {
        setLoginError({ type: "pending", message: data.message });
      } else {
        setLoginError({ type: "invalid" });
      }
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setForgotError(data.error ?? "Erro ao enviar e-mail. Tente novamente.");
      } else {
        setForgotSent(true);
      }
    } catch {
      setForgotError("Erro de conexão. Tente novamente.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <img
            src="/remax-sc-logo.jpg"
            alt="RE/MAX Santa Catarina"
            className="mx-auto w-64 h-auto rounded-xl shadow-sm"
          />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Método Ponto B</h1>
            <p className="text-muted-foreground">Seu Ponto B só existe quando vira agenda.</p>
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
            <CardDescription>Menos planejamento bonito. Mais execução visível.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="seu@email.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Senha</FormLabel>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => { setForgotOpen(true); setForgotSent(false); setForgotEmail(form.getValues("email")); }}
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPass ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="pr-10"
                            {...field}
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
                </Button>

                {loginError?.type === "pending" && (
                  <div className="flex gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Cadastro aguardando aprovação</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {loginError.message ?? "Seu acesso ainda não foi liberado. Você receberá um e-mail quando for aprovado."}
                      </p>
                    </div>
                  </div>
                )}

                {loginError?.type === "invalid" && (
                  <p className="text-sm text-center text-destructive">
                    E-mail ou senha incorretos.
                  </p>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Método Ponto B — RE/MAX SC &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={v => { setForgotOpen(v); if (!v) { setForgotSent(false); setForgotEmail(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
          </DialogHeader>

          {forgotSent ? (
            <div className="space-y-5 py-2">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">E-mail enviado!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Se o e-mail <strong>{forgotEmail}</strong> está cadastrado, você receberá um link para redefinir sua senha em instantes.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Verifique também a pasta de spam.</p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setForgotOpen(false)}>Fechar</Button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4 py-1">
              <p className="text-sm text-muted-foreground">
                Informe o e-mail da sua conta e enviaremos um link para redefinir sua senha.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">E-mail da conta</label>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />
              </div>
              {forgotError && (
                <p className="text-sm text-destructive">{forgotError}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" type="button" className="flex-1" onClick={() => setForgotOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={forgotLoading}>
                  {forgotLoading ? "Enviando..." : "Enviar link"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
