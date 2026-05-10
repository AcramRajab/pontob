import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface FranchisePickerProps {
  franchises: Array<{ id: number; name: string }>;
  value: number | undefined;
  onChange: (id: number | undefined) => void;
}

export function FranchisePicker({ franchises, value, onChange }: FranchisePickerProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/60 border border-border/50 rounded-lg">
      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground whitespace-nowrap">Visualizando franquia:</span>
      <Select
        value={value ? String(value) : ""}
        onValueChange={v => onChange(v ? parseInt(v) : undefined)}
      >
        <SelectTrigger className="h-8 flex-1 max-w-xs">
          <SelectValue placeholder="Selecione uma franquia" />
        </SelectTrigger>
        <SelectContent>
          {franchises.map((f: any) => (
            <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <Building2 className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
