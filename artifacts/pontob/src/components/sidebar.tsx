import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Target, CheckSquare, LayoutDashboard, History, HelpCircle, Trophy, Map, Users, Building, LogOut, ArrowRightCircle } from "lucide-react";
import { Button } from "./ui/button";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const role = user.role;
  const isMasterAdmin = role === "master_admin";
  const isStaffRegional = role === "staff_regional";
  const isFranqueado = role === "franqueado";
  const isResponsavelInterno = role === "responsavel_interno";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/10 p-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight text-sidebar-primary">Ponto B</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Execução</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/today"}>
                  <Link href="/today">
                    <CheckSquare />
                    <span>Hoje</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(isMasterAdmin || isStaffRegional || isFranqueado) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/goals")}>
                    <Link href="/goals">
                      <Target />
                      <span>Metas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/initiatives")}>
                  <Link href="/initiatives">
                    <ArrowRightCircle />
                    <span>Iniciativas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(isMasterAdmin || isStaffRegional || isFranqueado) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Análise</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/history"}>
                  <Link href="/history">
                    <History />
                    <span>Histórico</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(isMasterAdmin || isStaffRegional || isFranqueado) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/help"}>
                    <Link href="/help">
                      <HelpCircle />
                      <span>Ajuda</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isMasterAdmin || isStaffRegional) && (
          <SidebarGroup>
            <SidebarGroupLabel>Regional</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/ranking"}>
                    <Link href="/ranking">
                      <Trophy />
                      <span>Ranking</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/regional"}>
                    <Link href="/regional">
                      <Map />
                      <span>Regional Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isMasterAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/admin/franchises"}>
                    <Link href="/admin/franchises">
                      <Building />
                      <span>Franquias</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/admin/users"}>
                    <Link href="/admin/users">
                      <Users />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-border/10">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.franchiseName || user.role}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}