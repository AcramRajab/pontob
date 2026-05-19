import { useState } from "react";
import { X, ExternalLink, BarChart2, Home, List } from "lucide-react";
import { cn } from "@/lib/utils";

const REMAX_LINKS = [
  {
    label: "Ranking RE/MAX SC",
    description: "Dashboard de performance das franquias",
    url: "https://datastudio.google.com/u/0/reporting/b1c7fc2d-78f7-4957-a30d-f5320f991593/page/p_65ekbv19ad",
    icon: BarChart2,
    color: "#C8102E",
  },
  {
    label: "Hub Minha RE/MAX",
    description: "Portal interno da rede RE/MAX",
    url: "https://hub.minharemax.com/login",
    icon: Home,
    color: "#003DA5",
  },
  {
    label: "iList",
    description: "Plataforma de listagem de imóveis",
    url: "https://goiconnect.com/SignIn.aspx?ReturnUrl=%2f",
    icon: List,
    color: "#E87722",
  },
];

export function RemaxPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[13px] font-medium transition-colors",
          open
            ? "bg-white/[0.12] text-white"
            : "text-white/70 hover:text-white hover:bg-white/[0.07]"
        )}
        title="Portais RE/MAX"
      >
        <span className="h-[15px] w-[15px] shrink-0 flex items-center justify-center">
          <span className="text-[10px] font-black text-[#C8102E] leading-none">R</span>
        </span>
        <span>Portais RE/MAX</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="fixed bottom-16 left-[228px] z-50 w-72 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Portais RE/MAX</p>
              <button
                onClick={() => setOpen(false)}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-2 flex flex-col gap-1">
              {REMAX_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: link.color + "18" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: link.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{link.label}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">{link.description}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
