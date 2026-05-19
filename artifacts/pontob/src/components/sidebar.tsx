import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  Target, CheckSquare, LayoutDashboard, History, Trophy, Map,
  Users, Building, LogOut, ArrowRightCircle, UserCog, BookOpen,
  CalendarCheck, CalendarDays, CalendarRange, Briefcase, Bot,
  TableIcon, Eye, ClipboardList, LineChart, PlusCircle, HelpCircle,
  Sparkles, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiAssistant } from "./ai-assistant";
import { useTour } from "./tour-guide";

const SHORTCUTS = [
  { label: "ChatGPT",            url: "https://chatgpt.com",                abbr: "GP", color: "#10a37f" },
  { label: "Gemini",             url: "https://gemini.google.com",           abbr: "Ge", color: "#4285F4" },
  { label: "Perplexity",         url: "https://perplexity.ai",               abbr: "Pp", color: "#20808D" },
  { label: "Copilot",            url: "https://copilot.microsoft.com",       abbr: "Co", color: "#0078D4" },
  { label: "Gmail",              url: "https://mail.google.com",             abbr: "GM", color: "#EA4335" },
  { label: "Google Calendar",    url: "https://calendar.google.com",         abbr: "GC", color: "#1967D2" },
  { label: "WhatsApp Web",       url: "https://web.whatsapp.com",            abbr: "WA", color: "#25D366" },
  { label: "Canva",              url: "https://canva.com",                   abbr: "Cv", color: "#7D2AE8" },
  { label: "Google Drive",       url: "https://drive.google.com",            abbr: "GD", color: "#FBBC04" },
  { label: "Meta Business",      url: "https://business.facebook.com",       abbr: "MB", color: "#1877F2" },
];

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
          "flex items-center gap-2.5 mx-2 px-2.5 py-[6px] rounded-md text-[13px] font-medium transition-colors cursor-pointer select-none",
          active
            ? "bg-white/[0.10] text-white"
            : "text-white/50 hover:text-white/85 hover:bg-white/[0.05]"
        )}
      >
        <Icon className={cn("h-[15px] w-[15px] shrink-0", active ? "text-white" : "text-white/45")} strokeWidth={active ? 2.2 : 1.8} />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-white/25">
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
  const { openAssistant } = useAiAssistant();

  if (!user) return null;

  const role = user.role;
  const isMasterAdmin = role === "master_admin";
  const isStaffRegional = role === "staff_regional";
  const isFranqueado = role === "franqueado";

  const at = (path: string) => location === path;
  const startsWith = (prefix: string) => location.startsWith(prefix);

  return (
    <Sidebar className="border-r-0" style={{ "--sidebar-width": "220px" } as React.CSSProperties}>
      {/* ── LOGO ── */}
      <SidebarHeader className="px-4 py-4 border-b border-white/[0.06]">
        <img
          src="/remax-sc-logo.jpg"
          alt="RE/MAX SC"
          className="w-full h-auto object-contain rounded-md"
        />
        <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mt-2">
          Método Ponto B
        </p>
      </SidebarHeader>

      {/* ── NAV ── */}
      <SidebarContent className="py-2 overflow-y-auto flex-1">

        {/* Rotina Diária */}
        <NavSection label="Rotina" />
        <NavItem href="/today" icon={CheckSquare} label="Hoje" active={at("/today")} />
        <NavItem href="/checkin/daily" icon={CalendarCheck} label="Check-in Diário" active={at("/checkin/daily")} />
        <NavItem href="/planner/registro" icon={PlusCircle} label="Registro de Eventos" active={at("/planner/registro")} />

        {/* Semana */}
        <NavSection label="Semana" />
        <NavItem href="/planner" icon={TableIcon} label="Planner Semanal" active={at("/planner")} />
        <NavItem href="/checkin/weekly" icon={CalendarDays} label="Check-in Semanal" active={at("/checkin/weekly")} />

        {/* Metas */}
        <NavSection label="Metas" />
        {(isMasterAdmin || isStaffRegional || isFranqueado) && (
          <NavItem href="/goals" icon={Target} label="Metas" active={startsWith("/goals")} />
        )}
        <NavItem href="/initiatives" icon={ArrowRightCircle} label="Iniciativas" active={startsWith("/initiatives")} />
        <NavItem href="/checkin/monthly" icon={CalendarRange} label="Check-in Mensal" active={at("/checkin/monthly")} />

        {/* Acompanhamento */}
        <NavSection label="Acompanhamento" />
        {(isMasterAdmin || isStaffRegional || isFranqueado) && (
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={at("/dashboard")} />
        )}
        <NavItem href="/visao" icon={Eye} label="Visão Anual" active={at("/visao")} />
        <NavItem href="/planner/historico" icon={LineChart} label="Histórico Planner" active={at("/planner/historico")} />
        <NavItem href="/history" icon={History} label="Histórico" active={at("/history")} />

        {/* Regional */}
        {(isMasterAdmin || isStaffRegional) && (
          <>
            <NavSection label="Regional" />
            <NavItem href="/ranking" icon={Trophy} label="Ranking" active={at("/ranking")} />
            <NavItem href="/regional" icon={Map} label="Regional" active={at("/regional")} />
          </>
        )}

        {/* Pessoas */}
        {(isFranqueado || isMasterAdmin || isStaffRegional) && (
          <>
            <NavSection label="Pessoas" />
            <NavItem href="/recrutamento" icon={Briefcase} label="Recrutamento" active={at("/recrutamento") || startsWith("/recrutamento/vagas")} />
            <NavItem href="/recrutamento/secretaria" icon={Bot} label="Secretária IA" active={startsWith("/recrutamento/secretaria")} />
          </>
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
        <NavItem href="/agents" icon={Bot} label="Agentes IA" active={at("/agents")} />
        <NavItem href="/catalog" icon={BookOpen} label="Catálogo" active={at("/catalog")} />
        <NavItem href="/help" icon={HelpCircle} label="Ajuda" active={at("/help")} />

        {/* Admin */}
        {isMasterAdmin && (
          <>
            <NavSection label="Administração" />
            <NavItem href="/admin/franchises" icon={Building} label="Franquias" active={at("/admin/franchises")} />
            <NavItem href="/admin/users" icon={Users} label="Usuários" active={at("/admin/users")} />
            <NavItem href="/admin/history" icon={ClipboardList} label="Histórico Alt." active={at("/admin/history")} />
          </>
        )}
      </SidebarContent>

      {/* ── FOOTER ── */}
      <div className="border-t border-white/[0.06] shrink-0">
        {/* External shortcuts */}
        <div className="px-3 py-2.5 border-b border-white/[0.06]">
          <p className="text-[9px] font-semibold tracking-widest uppercase text-white/20 mb-2">Atalhos</p>
          <div className="flex flex-wrap gap-1.5">
            {SHORTCUTS.map(s => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                className="h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white transition-opacity opacity-75 hover:opacity-100 select-none shrink-0"
                style={{ backgroundColor: s.color }}
              >
                {s.abbr}
              </a>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-2 py-2 space-y-0.5">
          <button
            onClick={openAssistant}
            className="w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[13px] font-medium text-white/50 hover:text-white/85 hover:bg-white/[0.05] transition-colors"
          >
            <MessageCircle className="h-[15px] w-[15px] shrink-0 text-white/40" strokeWidth={1.8} />
            <span>Assistente IA</span>
          </button>
          <button
            onClick={startTour}
            className="w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[13px] font-medium text-white/50 hover:text-white/85 hover:bg-white/[0.05] transition-colors"
          >
            <Sparkles className="h-[15px] w-[15px] shrink-0 text-white/40" strokeWidth={1.8} />
            <span>Tutorial</span>
          </button>
        </div>

        {/* User row */}
        <div className="px-3 py-3 border-t border-white/[0.06] flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-white/80">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/80 truncate">{user.name}</p>
            <p className="text-[10px] text-white/35 truncate">{user.franchiseName || user.role}</p>
          </div>
          <button
            onClick={() => logout()}
            className="h-6 w-6 flex items-center justify-center rounded text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors shrink-0"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </Sidebar>
  );
}
