import { useState } from "react";
import { X, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  { label: "ChatGPT", url: "https://chat.openai.com", color: "#10a37f", abbr: "GP" },
  { label: "Gemini", url: "https://gemini.google.com", color: "#4285F4", abbr: "Ge" },
  { label: "Copilot", url: "https://copilot.microsoft.com", color: "#0078D4", abbr: "Co" },
  { label: "Perplexity", url: "https://www.perplexity.ai", color: "#20B2AA", abbr: "Px" },
  { label: "Gmail", url: "https://mail.google.com", color: "#EA4335", abbr: "Gm" },
  { label: "Calendar", url: "https://calendar.google.com", color: "#1E88E5", abbr: "Ca" },
  { label: "Drive", url: "https://drive.google.com", color: "#34A853", abbr: "Dr" },
  { label: "WhatsApp", url: "https://web.whatsapp.com", color: "#25D366", abbr: "Wa" },
  { label: "Gamma", url: "https://gamma.app", color: "#7C3AED", abbr: "Gam" },
  { label: "Canva", url: "https://canva.com", color: "#00C4CC", abbr: "Cv" },
  { label: "Meta Ads", url: "https://business.facebook.com", color: "#1877F2", abbr: "Mb" },
  { label: "YouTube", url: "https://youtube.com", color: "#FF0000", abbr: "Yt" },
];

export function ShortcutsPanel() {
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
        title="Atalhos"
      >
        <Grid3X3 className="h-[15px] w-[15px] shrink-0 text-white/60" strokeWidth={1.8} />
        <span>Atalhos</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-16 left-[228px] z-50 w-72 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Atalhos Rápidos</p>
              <button
                onClick={() => setOpen(false)}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-3 grid grid-cols-4 gap-2">
              {SHORTCUTS.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white text-[11px] font-bold shadow-sm"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.abbr}
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight truncate w-full text-center">
                    {s.label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
