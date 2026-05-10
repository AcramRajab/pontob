import { Link } from "wouter";
import { useListVagas, getListVagasQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Users, Briefcase, CheckCircle2, PauseCircle } from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";

const statusLabel: Record<string, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  preenchida: "Preenchida",
  rascunho: "Rascunho",
};
const statusColor: Record<string, string> = {
  ativa: "text-green-700 border-green-200 bg-green-50",
  pausada: "text-yellow-700 border-yellow-200 bg-yellow-50",
  preenchida: "text-blue-700 border-blue-200 bg-blue-50",
  rascunho: "text-gray-500 border-gray-200 bg-gray-50",
};

const STAGES = ["interessado", "triagem", "entrevista", "proposta", "contratado"];
const stageLabel: Record<string, string> = {
  interessado: "Interessados",
  triagem: "Triagem",
  entrevista: "Entrevista",
  proposta: "Proposta",
  contratado: "Contratados",
  arquivado: "Arquivados",
};

export default function Recrutamento() {
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();

  const params = franchiseId ? { franchiseId } : {};
  const { data: vagas = [], isLoading } = useListVagas(params, {
    query: { enabled: !!franchiseId, queryKey: getListVagasQueryKey(params) },
  });

  const ativas = vagas.filter((v: any) => v.status === "ativa");
  const totalCandidatos = vagas.reduce((sum: number, v: any) => sum + (v.candidatosCount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recrutamento</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie vagas e o pipeline de candidatos</p>
        </div>
        {franchiseId && (
          <Button asChild>
            <Link href="/recrutamento/vagas/new">
              <Plus className="h-4 w-4 mr-2" />
              Nova Vaga
            </Link>
          </Button>
        )}
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia para ver as vagas de recrutamento." />
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <Briefcase className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ativas.length}</p>
                    <p className="text-xs text-muted-foreground">Vagas ativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalCandidatos}</p>
                    <p className="text-xs text-muted-foreground">Candidatos no pipeline</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vagas.filter((v: any) => v.status === "preenchida").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Vagas preenchidas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vagas list */}
          {vagas.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma vaga cadastrada ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Crie a primeira vaga para começar a recrutar</p>
                <Button asChild className="mt-4">
                  <Link href="/recrutamento/vagas/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira vaga
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {vagas.map((vaga: any) => (
                <Link key={vaga.id} href={`/recrutamento/vagas/${vaga.id}`}>
                  <Card className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm truncate">{vaga.title}</p>
                            <Badge variant="outline" className={`text-xs shrink-0 ${statusColor[vaga.status] || ""}`}>
                              {statusLabel[vaga.status] || vaga.status}
                            </Badge>
                          </div>
                          {vaga.goalTitle && (
                            <p className="text-xs text-muted-foreground truncate">Ligada à meta: {vaga.goalTitle}</p>
                          )}
                          {vaga.profileSummary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{vaga.profileSummary}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{vaga.candidatosCount || 0} candidato{(vaga.candidatosCount || 0) !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mini funnel */}
                      {vaga.candidatosCount > 0 && (
                        <div className="mt-3 pt-3 border-t flex gap-1.5">
                          {STAGES.map((stage) => (
                            <div key={stage} className="flex-1 text-center">
                              <p className="text-xs text-muted-foreground leading-tight">{stageLabel[stage]}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
