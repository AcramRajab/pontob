import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  Target, CheckSquare, LayoutDashboard, History, Trophy, Map,
  Users, Building, LogOut, ArrowRightCircle, UserCog, BookOpen,
  CalendarCheck, CalendarDays, CalendarRange, Briefcase, Bot,
  TableIcon, Eye, ClipboardList, LineChart, PlusCircle, HelpCircle, Sparkles, MessageCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { useAiAssistant } from "./ai-assistant";
import { useTour } from "./tour-guide";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { startTour } = useTour();
  const { openAssistant } = useAiAssistant();

  if (!user) return null;

  const role = user.role;
  const isMasterAdmin = role === "master_admin";
  const isStaffRegional = role === "staff_regional";
  const isFranqueado = role === "franqueado";

  const isActive = (path: string) => location === path;
  const isActivePrefix = (prefix: string) => location.startsWith(prefix);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/10 p-4">
        <div className="flex flex-col gap-1.5">
          <img
            src="/remax-sc-logo.jpg"
            alt="RE/MAX Santa Catarina"
            className="w-full h-auto object-contain rounded-md"
          />
          <span className="text-xs font-semibold tracking-widest text-sidebar-primary/60 uppercase">Método Ponto B</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* ── ROTINA DIÁRIA ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Rotina Diária</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/today")}>
                  <Link href="/today">
                    <CheckSquare />
                    <span>Hoje</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/checkin/daily")}>
                  <Link href="/checkin/daily">
                    <CalendarCheck />
                    <span>Check-in Diário</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/planner/registro")}>
                  <Link href="/planner/registro">
                    <PlusCircle />
                    <span>Registro de Eventos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── SEMANA ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Semana</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/planner")}>
                  <Link href="/planner">
                    <TableIcon />
                    <span>Planner Semanal</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/checkin/weekly")}>
                  <Link href="/checkin/weekly">
                    <CalendarDays />
                    <span>Check-in Semanal</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── METAS & EXECUÇÃO ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Metas &amp; Execução</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(isMasterAdmin || isStaffRegional || isFranqueado) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActivePrefix("/goals")}>
                    <Link href="/goals">
                      <Target />
                      <span>Metas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActivePrefix("/initiatives")}>
                  <Link href="/initiatives">
                    <ArrowRightCircle />
                    <span>Iniciativas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/checkin/monthly")}>
                  <Link href="/checkin/monthly">
                    <CalendarRange />
                    <span>Check-in Mensal</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── ACOMPANHAMENTO ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Acompanhamento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(isMasterAdmin || isStaffRegional || isFranqueado) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/visao")}>
                  <Link href="/visao">
                    <Eye />
                    <span>Visão Anual</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/planner/historico")}>
                  <Link href="/planner/historico">
                    <LineChart />
                    <span>Histórico Planner</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/history")}>
                  <Link href="/history">
                    <History />
                    <span>Histórico</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── REGIONAL ── (staff/admin only) */}
        {(isMasterAdmin || isStaffRegional) && (
          <SidebarGroup>
            <SidebarGroupLabel>Regional</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/ranking")}>
                    <Link href="/ranking">
                      <Trophy />
                      <span>Ranking</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/regional")}>
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

        {/* ── PESSOAS ── */}
        {(isFranqueado || isMasterAdmin || isStaffRegional) && (
          <SidebarGroup>
            <SidebarGroupLabel>Pessoas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/recrutamento") || isActivePrefix("/recrutamento/vagas")}>
                    <Link href="/recrutamento">
                      <Briefcase />
                      <span>Recrutamento</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActivePrefix("/recrutamento/secretaria")}>
                    <Link href="/recrutamento/secretaria">
                      <Bot />
                      <span>Secretária IA</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ── MINHA FRANQUIA ── (franqueado only) */}
        {isFranqueado && (
          <SidebarGroup>
            <SidebarGroupLabel>Minha Franquia</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/my-team")}>
                    <Link href="/my-team">
                      <UserCog />
                      <span>Minha Equipe</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ── SUPORTE ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Suporte &amp; Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/agents")}>
                  <Link href="/agents">
                    <Bot />
                    <span>Agentes IA</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/catalog")}>
                  <Link href="/catalog">
                    <BookOpen />
                    <span>Catálogo</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/help")}>
                  <Link href="/help">
                    <HelpCircle />
                    <span>Ajuda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── ADMINISTRAÇÃO ── (master_admin only) */}
        {isMasterAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/franchises")}>
                    <Link href="/admin/franchises">
                      <Building />
                      <span>Franquias</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/users")}>
                    <Link href="/admin/users">
                      <Users />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/history")}>
                    <Link href="/admin/history">
                      <ClipboardList />
                      <span>Histórico de Alterações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── FOOTER ── */}
      <div className="mt-auto border-t border-border/10">
        <div className="p-3 space-y-1.5">
          <button
            onClick={openAssistant}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span>Assistente IA</span>
          </button>
          <button
            onClick={startTour}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Tutorial de uso</span>
          </button>
        </div>
        <div className="px-4 py-3 border-t border-border/10 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user.franchiseName || user.role}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()} className="shrink-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}
