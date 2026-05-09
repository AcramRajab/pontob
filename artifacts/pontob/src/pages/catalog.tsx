import { useListDimensions, useListKeyProcesses, useListStrategicInitiatives, getListKeyProcessesQueryKey, getListStrategicInitiativesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { BookOpen, Target } from "lucide-react";

export default function Catalog() {
  const [dimensionId, setDimensionId] = useState<string>("");
  const [keyProcessId, setKeyProcessId] = useState<string>("");

  const { data: dimensions = [], isLoading: dimsLoading } = useListDimensions();
  const kpParams = { dimensionId: dimensionId ? parseInt(dimensionId) : undefined };
  const { data: keyProcesses = [], isLoading: kpsLoading } = useListKeyProcesses(
    kpParams,
    { query: { enabled: true, queryKey: getListKeyProcessesQueryKey(kpParams) } }
  );
  const initParams = {
    dimensionId: dimensionId ? parseInt(dimensionId) : undefined,
    keyProcessId: keyProcessId ? parseInt(keyProcessId) : undefined,
  };
  const { data: initiatives = [], isLoading: initsLoading } = useListStrategicInitiatives(
    initParams,
    { query: { enabled: true, queryKey: getListStrategicInitiativesQueryKey(initParams) } }
  );

  const isLoading = dimsLoading || initsLoading;

  const dimensionColor = (name: string) =>
    name === "Pessoas" ? "bg-primary/10 text-primary border-primary/30" : "bg-destructive/10 text-destructive border-destructive/30";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo de Iniciativas</h1>
        <p className="text-muted-foreground mt-1">Iniciativas estratégicas disponíveis para cada processo-chave</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={dimensionId} onValueChange={v => { setDimensionId(v); setKeyProcessId(""); }}>
          <SelectTrigger className="w-44" data-testid="select-dimension">
            <SelectValue placeholder="Dimensão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as dimensões</SelectItem>
            {dimensions.map((d: any) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={keyProcessId} onValueChange={setKeyProcessId} disabled={!dimensionId}>
          <SelectTrigger className="w-56" data-testid="select-key-process">
            <SelectValue placeholder="Processo-chave" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os processos</SelectItem>
            {keyProcesses.map((kp: any) => (
              <SelectItem key={kp.id} value={String(kp.id)}>{kp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : initiatives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma iniciativa encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {initiatives.map((init: any) => (
            <Card key={init.id} data-testid={`card-initiative-${init.id}`} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-snug">{init.name}</CardTitle>
                  <Badge variant="outline" className={`text-xs shrink-0 ${dimensionColor(init.dimensionName || "")}`}>
                    {init.dimensionName}
                  </Badge>
                </div>
                <CardDescription className="text-xs">{init.keyProcessName}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KRI</span>
                  <p className="text-xs mt-0.5 leading-relaxed">{init.kri}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KPI</span>
                  <p className="text-xs mt-0.5 leading-relaxed">{init.kpi}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
