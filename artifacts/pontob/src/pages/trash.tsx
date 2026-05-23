import { useListTrash, getListTrashQueryKey, useRestoreGoal, useRestoreKpi, useRestoreGoalInitiative, getListGoalsQueryKey } from "@workspace/api-client-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, RotateCcw, Target, BarChart2, ArrowRightCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  goal: { label: "Meta", icon: Target, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
  kpi: { label: "KPI", icon: BarChart2, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  goal_initiative: { label: "Iniciativa", icon: ArrowRightCircle, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
};

export default function Trash() {
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const params = { franchiseId: franchiseId ?? undefined };
  const { data: items = [], isLoading, refetch } = useListTrash(
    params,
    { query: { enabled: !!franchiseId, queryKey: getListTrashQueryKey(params) } }
  );

  const restoreGoal = useRestoreGoal();
  const restoreKpi = useRestoreKpi();
  const restoreInitiative = useRestoreGoalInitiative();

  async function handleRestore(entityType: string, entityId: number) {
    const key = `${entityType}-${entityId}`;
    setRestoringId(key);
    try {
      if (entityType === "goal") {
        await restoreGoal.mutateAsync({ id: entityId });
      } else if (entityType === "kpi") {
        await restoreKpi.mutateAsync({ id: entityId });
      } else if (entityType === "goal_initiative") {
        await restoreInitiative.mutateAsync({ id: entityId });
      }
      await refetch();
      qc.invalidateQueries({ queryKey: getListGoalsQueryKey(params) });
      toast({ title: "Item restaurado com sucesso" });
    } catch {
      toast({ title: "Erro ao restaurar item", variant: "destructive" });
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          Lixeira
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Itens deletados — você pode restaurar qualquer um deles.
        </p>
      </div>

      {(isAdmin || isSocio) && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {(isAdmin || isSocio) && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia para ver a lixeira." />
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Trash2 className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum item deletado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const meta = TYPE_META[item.entityType] ?? TYPE_META.goal;
            const Icon = meta.icon;
            const key = `${item.entityType}-${item.entityId}`;
            const isRestoring = restoringId === key;

            return (
              <div
                key={key}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${meta.border} ${meta.bg}`}
              >
                <div className={`mt-0.5 shrink-0 rounded-md p-1.5 bg-white/60`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${meta.color} bg-white/70`}>
                      {meta.label}
                    </span>
                    <span className="font-medium text-sm truncate">{item.entityName}</span>
                  </div>

                  {(item.goalTitle || item.dimensionName || item.keyProcessName) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.goalTitle
                        ? <>KPI da meta: <span className="font-medium">{item.goalTitle}</span></>
                        : <>{item.dimensionName}{item.keyProcessName ? ` · ${item.keyProcessName}` : ""}</>
                      }
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Deletado em {formatDate(item.deletedAt)}
                    {item.deletedByName ? <> por <span className="font-medium text-muted-foreground">{item.deletedByName}</span></> : ""}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 gap-1.5 text-xs bg-white/80 hover:bg-white"
                  disabled={isRestoring}
                  onClick={() => handleRestore(item.entityType, item.entityId)}
                >
                  {isRestoring
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RotateCcw className="h-3.5 w-3.5" />
                  }
                  Restaurar
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center pt-2">
        <Link href="/goals" className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
          ← Voltar para Metas
        </Link>
      </div>
    </div>
  );
}
