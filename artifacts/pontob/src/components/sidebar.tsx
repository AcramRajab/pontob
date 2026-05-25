import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  Target, CheckSquare, LayoutDashboard, History, Trophy, Map,
  Users, Building, LogOut, ArrowRightCircle, UserCog, BookOpen,
  CalendarCheck, CalendarDays, CalendarRange, Briefcase, Bot,
  TableIcon, Eye, ClipboardList, LineChart, PlusCircle, HelpCircle,
  Sparkles, Navigation, BrainCircuit, Trash2, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTour } from "./tour-guide";
import { ShortcutsPanel } from "./shortcuts-panel";
import { RemaxPanel } from "./remax-panel";
import { useFranchiseContext } from "@/hooks/use-franchise-context";

const ROLE_LABELS: Record<string, string> = {
  master_admin:        "Master Admin",
  staff_regional:      "Regional",
  franqueado:          "Franqueado",
  responsavel_interno: "Resp. Interno",
  socio:               "Sócio",
};


function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-2.5 mx-2 px-2.5 py-[7px] rounded-md text-[15px] font-medium transition-colors cursor-pointer select-none",
          active
            ? "bg-white/[0.12] text-white"
            : "text-white/70 hover:text-white hover:bg-white/[0.07]"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-white/60")} strokeWidth={active ? 2.2 : 1.8} />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <span className="text-[11px] font-semibold tracking-widest uppercase text-white/40">
        {label}
      </span>
    </div>
  );
}

function NavDivider() {
  return <div className="mx-4 my-2 border-t border-white/[0.06]" />;
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { startTour } = useTour();
  const { franchiseId, isSocio, franchises } = useFranchiseContext();

  if (!user) return null;

  const role = user.role;
  const isMasterAdmin = role === "master_admin";
  const isStaffRegional = role === "staff_regional";
  const isFranqueado = role === "franqueado";
  const isAdminPanel = isMasterAdmin || isStaffRegional;

  // Resolve the currently active franchise name
  const activeFranchiseName: string | null =
    isAdminPanel ? null
    : isSocio
      ? (franchises.find((f: any) => f.id === franchiseId) as any)?.name ?? null
      : (user.franchiseName ?? null);

  const at = (path: string) => location === path;
  const startsWith = (prefix: string) => location.startsWith(prefix);

  return (
    <Sidebar className="border-r-0" style={{ "--sidebar-width": "220px" } as React.CSSProperties}>
      {/* ── LOGO / HEADER ── */}
      <SidebarHeader className="px-4 py-4 border-b border-white/[0.06]">
        {isAdminPanel ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-sidebar-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-bold text-white/90 leading-tight">Ponto B</p>
                <p className="text-[10px] text-sidebar-primary/80 font-semibold tracking-wide uppercase leading-tight">
                  {isMasterAdmin ? "Master Admin" : "Staff Regional"}
                </p>
              </div>
            </div>
            <div className="h-px bg-sidebar-primary/20 rounded-full" />
            <p className="text-[9px] font-semibold tracking-widest uppercase text-white/25">
              Painel Administrativo
            </p>
          </div>
        ) : (
          <>
            <img
              src="/remax-sc-logo.jpg"
              alt="RE/MAX SC"
              className="w-full h-auto object-contain rounded-md"
            />
            <div className="mt-2">
              <p className="text-[9px] font-semibold tracking-widest uppercase text-white/25 leading-none">Método</p>
              <p className="text-[16px] font-extrabold tracking-wide text-white/85 leading-tight mt-0.5">Ponto B</p>
            </div>
          </>
        )}
      </SidebarHeader>

      {/* ── NAV ── */}
      <SidebarContent className="py-2 overflow-y-auto flex-1">

        {isAdminPanel ? (
          /* ── ADMIN / STAFF REGIONAL sidebar ─────────────────────────────
             Compact: only management & monitoring tools. No operational
             franchise cadence (Rotina / Semana / Mês) since admins oversee
             franchises, they don't run the daily method themselves.        */
          <>
            {/* Acompanhamento */}
            <NavSection label="Acompanhamento" />
            <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={at("/dashboard")} />
            <NavItem href="/ranking" icon={Trophy} label="Ranking" active={at("/ranking")} />
            <NavItem href="/history" icon={History} label="Histórico" active={at("/history")} />
            <NavItem href="/visao" icon={Eye} label="Visão Anual" active={at("/visao")} />
            <NavItem href="/jornada" icon={Navigation} label="Mapa de Jornada" active={at("/jornada")} />
            <NavItem href="/coaching" icon={BrainCircuit} label="Coaching IA" active={at("/coaching")} />

            {/* Regional */}
            <NavSection label="Regional" />
            <NavItem href="/regional" icon={Map} label="Regional" active={at("/regional")} />

            {/* Pessoas */}
            <NavSection label="Pessoas" />
            <NavItem href="/recrutamento" icon={Briefcase} label="Recrutamento" active={at("/recrutamento") || startsWith("/recrutamento/vagas")} />
            <NavItem href="/recrutamento/secretaria" icon={Bot} label="Secretária IA" active={startsWith("/recrutamento/secretaria")} />

            {/* Suporte */}
            <NavDivider />
            <NavItem href="/agents" icon={Bot} label="Agentes IA" active={at("/agents")} />
            <NavItem href="/catalog" icon={BookOpen} label="Catálogo" active={at("/catalog")} />
            <NavItem href="/help" icon={HelpCircle} label="Ajuda" active={at("/help")} />

            {/* Administração */}
            {isMasterAdmin && (
              <>
                <NavSection label="Administração" />
                <NavItem href="/admin/franchises" icon={Building} label="Franquias" active={at("/admin/franchises")} />
                <NavItem href="/admin/users" icon={Users} label="Usuários" active={at("/admin/users")} />
                <NavItem href="/admin/history" icon={ClipboardList} label="Histórico Alt." active={at("/admin/history")} />
              </>
            )}
          </>
        ) : (
          /* ── FRANQUEADO / RESPONSÁVEL sidebar ───────────────────────────
             Full operational flow matching the tutorial's chronology:
             Planejamento → Semana → Rotina → Mês → Acompanhamento        */
          <>
            {/* 1º — Planejamento (foundation: do these first when onboarding) */}
            <NavSection label="Planejamento" />
            <NavItem href="/visao" icon={Eye} label="Visão Anual" active={at("/visao")} />
            {isFranqueado && (
              <NavItem href="/goals" icon={Target} label="Metas" active={startsWith("/goals")} />
            )}
            <NavItem href="/initiatives" icon={ArrowRightCircle} label="Iniciativas" active={startsWith("/initiatives")} />

            {/* 2º — Semana (plan the week first, then execute daily) */}
            <NavSection label="Semana" />
            <NavItem href="/planner" icon={TableIcon} label="Planner Semanal" active={at("/planner")} />
            <NavItem href="/checkin/weekly" icon={CalendarDays} label="Check-in Semanal" active={at("/checkin/weekly")} />

            {/* 3º — Rotina Diária */}
            <NavSection label="Rotina" />
            <NavItem href="/today" icon={CheckSquare} label="Hoje" active={at("/today")} />
            <NavItem href="/checkin/daily" icon={CalendarCheck} label="Check-in Diário" active={at("/checkin/daily")} />
            <NavItem href="/planner/registro" icon={PlusCircle} label="Registro de Eventos" active={at("/planner/registro")} />

            {/* 4º — Mês */}
            <NavSection label="Mês" />
            <NavItem href="/checkin/monthly" icon={CalendarRange} label="Check-in Mensal" active={at("/checkin/monthly")} />

            {/* 5º — Acompanhamento */}
            <NavSection label="Acompanhamento" />
            {isFranqueado && (
              <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={at("/dashboard")} />
            )}
            <NavItem href="/history" icon={History} label="Histórico" active={at("/history")} />
            <NavItem href="/ranking" icon={Trophy} label="Ranking" active={at("/ranking")} />
            {isFranqueado && (
              <NavItem href="/trash" icon={Trash2} label="Lixeira" active={at("/trash")} />
            )}

            {/* Minha Franquia */}
            {isFranqueado && (
              <>
                <NavSection label="Franquia" />
                <NavItem href="/my-team" icon={UserCog} label="Minha Equipe" active={at("/my-team")} />
              </>
            )}

            {/* Suporte */}
            <NavDivider />
            <NavItem href="/catalog" icon={BookOpen} label="Catálogo" active={at("/catalog")} />
            <NavItem href="/help" icon={HelpCircle} label="Ajuda" active={at("/help")} />
          </>
        )}
      </SidebarContent>

      {/* ── FOOTER ── */}
      <div className="border-t border-white/[0.06] shrink-0">

        {/* Quick actions */}
        <div className="px-2 py-2 space-y-0.5">
          <RemaxPanel />
          <ShortcutsPanel />
          <button
            onClick={startTour}
            className="w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[15px] font-medium text-white/70 hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            <Sparkles className="h-[15px] w-[15px] shrink-0 text-white/60" strokeWidth={1.8} />
            <span>Tutorial</span>
          </button>
        </div>

        {/* User row */}
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2.5">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isAdminPanel ? "bg-sidebar-primary/20" : "bg-white/10"}`}>
              {isAdminPanel
                ? <ShieldCheck className="h-3.5 w-3.5 text-sidebar-primary" strokeWidth={2} />
                : <span className="text-[11px] font-semibold text-white/80">{user.name?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white/80 truncate">{user.name}</p>
              <p className="text-[11px] text-white/40 truncate">
                {ROLE_LABELS[role] ?? role}
                {isAdminPanel && " · RE/MAX SC"}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="h-6 w-6 flex items-center justify-center rounded text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors shrink-0"
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>

          {/* Active franchise badge */}
          {activeFranchiseName && (
            <div className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1.5">
              <Building className="h-3 w-3 text-white/30 shrink-0" />
              <span className="text-[11px] text-white/55 truncate font-medium">{activeFranchiseName}</span>
            </div>
          )}
        </div>
      </div>
    </Sidebar>
  );
}
