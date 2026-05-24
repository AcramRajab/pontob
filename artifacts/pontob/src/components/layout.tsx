import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { TourProvider } from "./tour-guide";
import { AiAssistantProvider } from "./ai-assistant";
import { CheckinGate } from "./checkin-gate";

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
                <main className="flex-1 overflow-y-auto">
                  <div className="mx-auto max-w-5xl px-5 py-6 md:px-8 md:py-8">
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
