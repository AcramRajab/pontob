export function ProgressLegend({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 text-xs text-muted-foreground ${className ?? ""}`}>
      <span className="font-medium">Legenda:</span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
        <span className="text-blue-600 font-semibold">≥ 80%</span>
        <span>em dia</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground" />
        <span className="font-semibold">51–79%</span>
        <span>em andamento</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
        <span className="text-red-600 font-semibold">≤ 50%</span>
        <span>crítico</span>
      </span>
    </div>
  );
}
