import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Users, CheckCircle2, XCircle, Clock, Phone, Mail, MessageCircle, ChevronRight } from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const resultadoConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aprovado: {
    label: "Aprovado",
    color: "text-green-700 border-green-200 bg-green-50",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  reprovado: {
    label: "Reprovado",
    color: "text-red-700 border-red-200 bg-red-50",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function Recrutamento() {
  const { user } = useAuth();
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
  const effectiveFranchiseId = franchiseId ?? user?.franchiseId;

  const { data: candidatos = [], isLoading } = useQuery<any[]>({
    queryKey: ["recruiting-candidatos", effectiveFranchiseId],
    queryFn: async () => {
      if (!effectiveFranchiseId) return [];
      const res = await fetch(`/api/recruiting/candidatos?franchiseId=${effectiveFranchiseId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!effectiveFranchiseId,
  });

  const aprovados = candidatos.filter((c) => c.resultadoFinal === "aprovado").length;
  const reprovados = candidatos.filter((c) => c.resultadoFinal === "reprovado").length;
  const pendentes = candidatos.filter((c) => !c.resultadoFinal).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recrutamento</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Pipeline de candidatos e resultados das entrevistas</p>
        </div>
        {effectiveFranchiseId && (
          <Button asChild>
            <Link href="/recrutamento/candidatos/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo Candidato
            </Link>
          </Button>
        )}
      </div>

      {(isAdmin || isSocio) && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {(isAdmin || isSocio) && !effectiveFranchiseId ? (
        <AdminEmptyState message="Selecione uma franquia para ver os candidatos." />
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{candidatos.length}</p>
                    <p className="text-xs text-muted-foreground">Total de candidatos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{aprovados}</p>
                    <p className="text-xs text-muted-foreground">Aprovados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2">
                    <Clock className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700">{pendentes}</p>
                    <p className="text-xs text-muted-foreground">Em avaliação</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Candidatos list */}
          {candidatos.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum candidato cadastrado ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Cadastre o primeiro candidato para começar</p>
                <Button asChild className="mt-4">
                  <Link href="/recrutamento/candidatos/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar primeiro candidato
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {candidatos.map((c: any) => {
                const resultado = c.resultadoFinal ? resultadoConfig[c.resultadoFinal] : null;
                return (
                  <Link key={c.id} href={`/recrutamento/candidatos/${c.id}`}>
                    <Card className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
                      <CardContent className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm truncate">{c.name}</p>
                              {resultado ? (
                                <Badge variant="outline" className={cn("text-xs shrink-0 flex items-center gap-1", resultado.color)}>
                                  {resultado.icon}
                                  {resultado.label}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs shrink-0 text-amber-700 border-amber-200 bg-amber-50 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Em avaliação
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {c.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {c.phone}
                                </span>
                              )}
                              {c.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3" />
                                  {c.email}
                                </span>
                              )}
                              <span className="shrink-0">{formatDate(c.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.phone && (
                              <a
                                href={whatsappUrl(c.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-green-600 border-green-200 hover:bg-green-50">
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        </div>

                        {/* Preview of interview notes */}
                        {(c.notasEntrevistaOnline || c.notasEntrevistaPresencial) && (
                          <div className="mt-2 pt-2 border-t border-border/40">
                            {c.notasEntrevistaOnline && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                <span className="font-medium text-foreground/60">Online:</span> {c.notasEntrevistaOnline}
                              </p>
                            )}
                            {c.notasEntrevistaPresencial && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                <span className="font-medium text-foreground/60">Presencial:</span> {c.notasEntrevistaPresencial}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
