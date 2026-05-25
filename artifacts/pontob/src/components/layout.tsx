import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { useAuth } from "@/lib/auth";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { Loader2, Building2, ShieldCheck, CalendarDays } from "lucide-react";
import { TourProvider } from "./tour-guide";
import { AiAssistantProvider } from "./ai-assistant";
import { CheckinGate } from "./checkin-gate";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const ROLE_LABELS: Record<string, string> = {
  master_admin:        "Master Admin",
  staff_regional:      "Staff Regional",
  franqueado:          "Franqueado",
  responsavel_interno: "Resp. Interno",
  socio:               "Sócio",
};

const ROLE_COLORS: Record<string, string> = {
  master_admin:        "bg-blue-100 text-blue-700 border-blue-200",
  staff_regional:      "bg-indigo-100 text-indigo-700 border-indigo-200",
  franqueado:          "bg-emerald-100 text-emerald-700 border-emerald-200",
  responsavel_interno: "bg-amber-100 text-amber-700 border-amber-200",
  socio:               "bg-violet-100 text-violet-700 border-violet-200",
};

function PageContextBar() {
  const { user } = useAuth();
  const { franchiseId, isSocio, franchises } = useFranchiseContext();

  const dateLabel = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
    const day = now.getDate();
    const month = now.toLocaleDateString("pt-BR", { month: "long" });
    const year = now.getFullYear();
    // Capitalize weekday
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month} de ${year}`;
  }, []);

  if (!user) return null;

  const role = user.role;
  const isAdmin = role === "master_admin" || role === "staff_regional";

  const franchiseName = isAdmin
    ? null
    : isSocio
    ? (franchises.find((f: any) => f.id === franchiseId) as any)?.name ?? null
    : (user.franchiseName ?? null);

  const roleLabel = ROLE_LABELS[role] ?? role;
  const roleColor = ROLE_COLORS[role] ?? "bg-muted text-muted-foreground border-border";

  return (
    <div className="shrink-0 border-b border-border/60 bg-muted/30 px-5 md:px-6 py-2 flex items-center justify-between gap-4">
      {/* Left: franchise / panel name */}
      <div className="flex items-center gap-2 min-w-0">
        {isAdmin ? (
          <>
            <ShieldCheck className="h-3.5 w-3.5 text-primary/60 shrink-0" strokeWidth={2} />
            <span className="text-[12px] font-semibold text-foreground/70 truncate">
              RE/MAX SC · Painel Administrativo
            </span>
          </>
        ) : franchiseName ? (
          <>
            <Building2 className="h-3.5 w-3.5 text-primary/60 shrink-0" strokeWidth={2} />
            <span className="text-[13px] font-bold text-foreground/80 truncate">{franchiseName}</span>
          </>
        ) : (
          <span className="text-[12px] text-muted-foreground italic">Nenhuma franquia selecionada</span>
        )}
      </div>

      {/* Center: current date */}
      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium shrink-0">
        <CalendarDays className="h-3 w-3 opacity-60" strokeWidth={2} />
        <span>{dateLabel}</span>
      </div>

      {/* Right: user + role badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[12px] text-muted-foreground font-medium hidden sm:block truncate max-w-[140px]">
          {user.name}
        </span>
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border",
          roleColor
        )}>
          {roleLabel}
        </span>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const isAdmin = user.role === "master_admin" || user.role === "staff_regional";

  return (
    <TourProvider>
      <AiAssistantProvider>
        <CheckinGate>
          <SidebarProvider>
            <div className={`flex h-screen w-full bg-background${isAdmin ? " theme-admin" : ""}`}>
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="h-12 lg:hidden border-b border-border/60 flex items-center px-4 shrink-0 bg-background/95 backdrop-blur-sm">
                  <SidebarTrigger />
                  <span className="text-sm font-semibold ml-3 text-foreground/80 tracking-tight">Ponto B</span>
                </header>
                <PageContextBar />
                <main className="flex-1 overflow-y-auto">
                  <div className="mx-auto max-w-7xl px-5 py-6 md:px-6 md:py-8">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </CheckinGate>
      </AiAssistantProvider>
    </TourProvider>
  );
}
