import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  ClipboardList, RotateCcw, User, Building, Target, Filter, AlertCircle,
  Layers, GitBranch, Sparkles, TrendingUp, TrendingDown,
} from "lucide-react";

interface AuditLog {
  id: number;
  userId: number | null;
  userName: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: number | null;
  entityName: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  undone: boolean;
  undoneAt: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: "Criou",
  update: "Atualizou",
  delete: "Excluiu",
  activated: "Ativou",
  deactivated: "Desativou",
};

const ENTITY_LABELS: Record<string, string> = {
  franchise: "Franquia",
  user: "Usuário",
  goal: "Meta",
  initiative: "Iniciativa",
  kri: "KRI",
  dimension: "Dimensão",
  key_process: "Processo-chave",
  strategic_initiative: "Iniciativa Estratégica",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  activated: "bg-emerald-100 text-emerald-800",
  deactivated: "bg-orange-100 text-orange-800",
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  franchise: Building,
  user: User,
  goal: Target,
  initiative: Target,
  kri: Target,
  dimension: Layers,
  key_process: GitBranch,
  strategic_initiative: Sparkles,
};

const CATALOG_ENTITY_TYPES = new Set(["dimension", "key_process", "strategic_initiative"]);
const CATALOG_ACTIONS = new Set(["activated", "deactivated"]);

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? "bg-muted text-muted-foreground";
  const label = ACTION_LABELS[action] ?? action;
  const Icon = CATALOG_ACTIONS.has(action)
    ? action === "activated" ? TrendingUp : TrendingDown
    : null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

function ChangesTable({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  if (!oldData && !newData) return null;

  if (oldData && newData) {
    const changedKeys = Object.keys(newData).filter(
      k => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    );
    if (changedKeys.length === 0) return null;
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-2 py-1 text-left font-medium text-muted-foreground">Campo</th>
              <th className="px-2 py-1 text-left font-medium text-muted-foreground">Antes</th>
              <th className="px-2 py-1 text-left font-medium text-muted-foreground">Depois</th>
            </tr>
          </thead>
          <tbody>
            {changedKeys.map(k => (
              <tr key={k} className="border-t border-border/50">
                <td className="px-2 py-1 font-medium">{k}</td>
                <td className="px-2 py-1 text-red-600 line-through">{String(oldData[k] ?? "—")}</td>
                <td className="px-2 py-1 text-green-700">{String(newData[k] ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const data = oldData || newData;
  if (!data) return null;
  return (
    <details className="mt-2">
      <summary className="text-xs text-muted-foreground cursor-pointer">Ver dados</summary>
      <pre className="text-xs bg-muted rounded p-2 mt-1 overflow-auto max-h-32">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export default function AdminHistory() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterActor, setFilterActor] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const isMasterAdmin = user?.role === "master_admin";
  const isStaffRegional = user?.role === "staff_regional";

  if (!user || (!isMasterAdmin && !isStaffRegional)) {
    setTimeout(() => navigate("/today"), 0);
    return null;
  }

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/audit-logs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    staleTime: 30_000,
  });

  const undoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/audit-logs/${id}/undo`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Falha ao desfazer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
      toast({ title: "Ação desfeita com sucesso." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao desfazer", description: err.message, variant: "destructive" });
    },
  });

  const actors = Array.from(new Set(logs.map(l => l.userEmail)));

  const filtered = logs.filter(l => {
    if (filterActor !== "all" && l.userEmail !== filterActor) return false;
    if (filterAction !== "all" && l.action !== filterAction) return false;
    if (filterEntity !== "all" && l.entityType !== filterEntity) return false;
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(l.createdAt) < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(l.createdAt) > to) return false;
    }
    return true;
  });

  const hasFilters = filterActor !== "all" || filterAction !== "all" || filterEntity !== "all"
    || filterDateFrom !== "" || filterDateTo !== "";

  function clearFilters() {
    setFilterActor("all");
    setFilterAction("all");
    setFilterEntity("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Histórico de Atividade</h1>
          <p className="text-sm text-muted-foreground">
            Todas as modificações e alterações de catálogo registradas pelo sistema
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 self-center text-muted-foreground">
              <Filter className="h-4 w-4" />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={filterActor} onValueChange={setFilterActor}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {actors.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Ação</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="create">Criou</SelectItem>
                  <SelectItem value="update">Atualizou</SelectItem>
                  <SelectItem value="delete">Excluiu</SelectItem>
                  <SelectItem value="activated">Ativou</SelectItem>
                  <SelectItem value="deactivated">Desativou</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="franchise">Franquia</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="goal">Meta</SelectItem>
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
                className="w-36"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-36"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="self-end">
                Limpar filtros
              </Button>
            )}

            <span className="text-sm text-muted-foreground ml-auto self-end">
              {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando histórico…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma alteração registrada ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters
                ? "Tente ajustar os filtros para ver mais resultados."
                : "As modificações feitas pela Equipe Regional aparecem aqui."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => {
            const Icon = ENTITY_ICONS[log.entityType] || ClipboardList;
            const isCatalogAction = CATALOG_ACTIONS.has(log.action);
            const canUndo = isMasterAdmin && !log.undone && !isCatalogAction && log.action !== "create";
            return (
              <Card key={log.id} className={log.undone ? "opacity-60" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-muted shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ActionBadge action={log.action} />
                        <span className="text-sm font-medium">
                          {ENTITY_LABELS[log.entityType] ?? log.entityType}
                        </span>
                        {log.entityName && (
                          <span className="text-sm text-muted-foreground">— {log.entityName}</span>
                        )}
                        {CATALOG_ENTITY_TYPES.has(log.entityType) && (
                          <Badge variant="secondary" className="text-xs">Catálogo</Badge>
                        )}
                        {log.undone && (
                          <Badge variant="outline" className="text-xs">Desfeito</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por <strong>{log.userName}</strong> ({log.userEmail}) · {formatDate(log.createdAt)}
                      </p>
                      {!isCatalogAction && (
                        <ChangesTable oldData={log.oldData} newData={log.newData} />
                      )}
                    </div>
                    {canUndo && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1.5"
                            disabled={undoMutation.isPending}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Desfazer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Desfazer alteração?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso vai reverter a ação de <strong>{log.userName}</strong> em{" "}
                              <strong>{log.entityName}</strong>. Esta operação não pode ser desfeita novamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => undoMutation.mutate(log.id)}>
                              Sim, desfazer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
