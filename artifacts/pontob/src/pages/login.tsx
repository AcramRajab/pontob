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
import { Eye, EyeOff, Mail, Phone } from "lucide-react";

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

  useEffect(() => {
    if (user) {
      setLocation("/today");
    }
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await login(values);
    } catch (error) {
      console.error(error);
    }
  }

  function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (forgotEmail) setForgotSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <img
            src="/remax-sc-logo.png"
            alt="RE/MAX Santa Catarina"
            className="mx-auto h-14 w-auto"
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
                  <p className="font-semibold">Solicitação registrada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Um administrador redefinirá a senha da conta <strong>{forgotEmail}</strong> e entrará em contato com você.
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <p className="font-medium text-foreground">Fale diretamente com o suporte:</p>
                <a
                  href="mailto:suporte@remaxsc.com.br"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  suporte@remaxsc.com.br
                </a>
                <a
                  href="tel:+5548999999999"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  (48) 9 9999-9999
                </a>
              </div>
              <Button className="w-full" onClick={() => setForgotOpen(false)}>Fechar</Button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4 py-1">
              <p className="text-sm text-muted-foreground">
                Informe o e-mail da sua conta. Um administrador irá redefinir sua senha e entrar em contato.
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
              <div className="flex gap-2">
                <Button variant="outline" type="button" className="flex-1" onClick={() => setForgotOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Solicitar recuperação
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
