import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History, Filter, AlertCircle, Download, TrendingUp, TrendingDown, Layers, GitBranch, Sparkles, Undo2, Loader2 } from "lucide-react";
import { useListAllCatalogActivity, getListAllCatalogActivityQueryKey, useUndoCatalogActivity } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  dimension: "Dimensão",
  key_process: "Processo-chave",
  strategic_initiative: "Iniciativa Estratégica",
};

const ACTION_LABELS: Record<string, string> = {
  activated: "Ativou",
  deactivated: "Desativou",
};

const ACTION_COLORS: Record<string, string> = {
  activated: "bg-green-100 text-green-800",
  deactivated: "bg-red-100 text-red-800",
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  dimension: Layers,
  key_process: GitBranch,
  strategic_initiative: Sparkles,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export default function CatalogHistory() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [pendingUndoId, setPendingUndoId] = useState<number | null>(null);

  if (!user || (user.role !== "master_admin" && user.role !== "staff_regional")) {
    setTimeout(() => navigate("/today"), 0);
    return null;
  }

  const isMasterAdmin = user.role === "master_admin";

  const queryParams = {
    entityType: filterEntityType !== "all" ? (filterEntityType as "dimension" | "key_process" | "strategic_initiative") : undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
  };

  const { data: entries = [], isLoading } = useListAllCatalogActivity(queryParams, {
    query: { queryKey: getListAllCatalogActivityQueryKey(queryParams) },
  });

  const undoMutation = useUndoCatalogActivity({
    mutation: {
      onSuccess: (_data, variables) => {
        setPendingUndoId(null);
        queryClient.invalidateQueries({ queryKey: getListAllCatalogActivityQueryKey(queryParams) });
        toast({ title: "Ação desfeita com sucesso." });
      },
      onError: () => {
        setPendingUndoId(null);
        toast({ title: "Erro ao desfazer ação.", variant: "destructive" });
      },
    },
  });

  function handleUndo(entryId: number) {
    setPendingUndoId(entryId);
    undoMutation.mutate({ id: entryId });
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (filterDateFrom) params.set("from", filterDateFrom);
    if (filterDateTo) params.set("to", filterDateTo);
    const qs = params.toString();
    const url = `${import.meta.env.BASE_URL}api/catalog-audit-logs/export${qs ? `?${qs}` : ""}`;
    window.open(url, "_blank");
  }

  function clearFilters() {
    setFilterEntityType("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  const hasFilters = filterEntityType !== "all" || filterDateFrom !== "" || filterDateTo !== "";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Histórico de Atividade do Catálogo</h1>
            <p className="text-sm text-muted-foreground">
              Todas as ativações e desativações de dimensões, processos-chave e iniciativas estratégicas
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2 text-muted-foreground self-center">
              <Filter className="h-4 w-4" />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Tipo de item</Label>
              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="dimension">Dimensão</SelectItem>
                  <SelectItem value="key_process">Processo-chave</SelectItem>
                  <SelectItem value="strategic_initiative">Iniciativa Estratégica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-40"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="self-end">
                Limpar filtros
              </Button>
            )}

            <span className="text-sm text-muted-foreground ml-auto self-end">
              {isLoading ? "Carregando…" : `${entries.length} registro${entries.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando histórico…</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma atividade encontrada.</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters
                ? "Tente ajustar os filtros para ver mais resultados."
                : "As ativações e desativações do catálogo aparecem aqui."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const Icon = ENTITY_ICONS[entry.entityType] ?? History;
            const isActivated = entry.action === "activated";
            const isUndoing = pendingUndoId === entry.id;
            return (
              <Card key={entry.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-muted shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {isActivated ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                        <Badge variant="outline" className="text-xs font-normal">
                          {ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}
                        </Badge>
                        {entry.entityName && (
                          <span className="text-sm font-medium truncate">{entry.entityName}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por <strong>{entry.userName}</strong> ({entry.userEmail}) ·{" "}
                        {formatDate(entry.changedAt)}
                      </p>
                    </div>
                    {isMasterAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        disabled={isUndoing || undoMutation.isPending}
                        onClick={() => handleUndo(entry.id)}
                      >
                        {isUndoing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="h-3.5 w-3.5" />
                        )}
                        Desfazer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
