import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  confirm: z.string().min(1, "Confirme a senha"),
}).refine(d => d.password === d.confirm, {
  message: "As senhas não coincidem",
  path: ["confirm"],
});

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="font-semibold">Link inválido</p>
            <p className="text-sm text-muted-foreground">Este link de redefinição é inválido ou expirou.</p>
            <Button className="w-full" onClick={() => setLocation("/login")}>Voltar ao login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <p className="font-semibold text-lg">Senha redefinida!</p>
            <p className="text-sm text-muted-foreground">Sua senha foi atualizada com sucesso. Você já pode entrar com a nova senha.</p>
            <Button className="w-full" onClick={() => setLocation("/login")}>Ir para o login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Erro ao redefinir senha. O link pode ter expirado.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg("Erro de conexão. Tente novamente.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <img src="/remax-sc-logo.jpg" alt="RE/MAX SC" className="mx-auto w-64 h-auto rounded-xl shadow-sm" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Método Ponto B</h1>
            <p className="text-muted-foreground">Crie uma nova senha para sua conta.</p>
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Redefinir senha</CardTitle>
            <CardDescription>Escolha uma nova senha com pelo menos 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            {status === "error" && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 mb-4">
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPass ? "text" : "password"} placeholder="Mínimo 8 caracteres" className="pr-10" {...field} />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showConfirm ? "text" : "password"} placeholder="Repita a nova senha" className="pr-10" {...field} />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}>
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Salvando..." : "Salvar nova senha"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation("/login")}>
                  Voltar ao login
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
