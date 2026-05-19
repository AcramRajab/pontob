import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, X, Loader2, RotateCcw, MessageCircle, ExternalLink, Users, FileText, PhoneCall, TrendingUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const BROKERS_SDR_URL = "https://chatgpt.com/g/g-68be1c658e98819198dc349421011784-assitente-de-brokers-e-sdr-re-max";
const CURRICULOS_URL = "https://chatgpt.com/g/g-6829f77aa8a48191a9decf10f23409f8-templum-analizador-de-curriculos";
const BANT_URL = "https://chatgpt.com/g/g-68307072b6fc8191bbdd83d1c338f7fa-construtor-bant-script-de-pre-vendas-aptitude-r";
const SPIN_URL = "https://chatgpt.com/g/g-6830c25fdf3081918c35b78a6a5a87db-construtor-spin-selling-vendas-aptitude-r";
const CONSELHO_URL = "https://chatgpt.com/g/g-68b4aaa283cc8191a267bd86646246ac-conselho-templum-evolutto";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "Como faço meu check-in diário?",
  "Como criar uma nova meta?",
  "Como funciona a pontuação?",
  "O que é o Planner Semanal?",
];

function AssistantPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o Assistente do Método Ponto B. Pode me perguntar sobre qualquer funcionalidade da plataforma — check-ins, metas, iniciativas, dashboard, ou como começar. Como posso ajudar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const allMessages = [...messages, userMsg];
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) throw new Error("Erro na resposta");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.done) break;
            if (payload.content) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + payload.content,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Desculpe, ocorreu um erro. Tente novamente.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }, [messages, isStreaming]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "min(600px, calc(100vh - 5rem))" }}>
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <p className="font-semibold text-sm leading-none">Assistente IA</p>
            <p className="text-xs opacity-70 mt-0.5">Método Ponto B</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setMessages([{ role: "assistant", content: "Olá! Como posso ajudar?" }])}
            title="Nova conversa"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "rounded-2xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}
            >
              {msg.content}
              {msg.role === "assistant" && isStreaming && i === messages.length - 1 && !msg.content && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-3 pb-2 space-y-2 shrink-0">
          <a
            href={BROKERS_SDR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">Agente Brokers &amp; SDR</p>
              <p className="text-xs opacity-70 leading-tight mt-0.5">Abrir no ChatGPT →</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
          </a>
          <a
            href={CURRICULOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">Analisador de Currículos</p>
              <p className="text-xs opacity-70 leading-tight mt-0.5">Abrir no ChatGPT →</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
          </a>
          <a
            href={BANT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <PhoneCall className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">Construtor BANT &amp; Script</p>
              <p className="text-xs opacity-70 leading-tight mt-0.5">Abrir no ChatGPT →</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
          </a>
          <a
            href={SPIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">Construtor SPIN Selling</p>
              <p className="text-xs opacity-70 leading-tight mt-0.5">Abrir no ChatGPT →</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
          </a>
          <a
            href={CONSELHO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">Conselho Templum Evolutto</p>
              <p className="text-xs opacity-70 leading-tight mt-0.5">Abrir no ChatGPT →</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
          </a>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-muted hover:bg-muted/80 rounded-full px-3 py-1.5 text-foreground transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 pb-3 pt-2 border-t border-border shrink-0 flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo sobre a plataforma..."
          className="resize-none min-h-[40px] max-h-[120px] text-sm"
          rows={1}
          disabled={isStreaming}
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          className="shrink-0 self-end"
        >
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function AiAssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
      <div className="space-y-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span>Assistente IA</span>
        </button>
        <a
          href={BROKERS_SDR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 transition-colors"
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>Agente Brokers &amp; SDR</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
        </a>
        <a
          href={CURRICULOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 transition-colors"
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span>Analisador de Currículos</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
        </a>
        <a
          href={BANT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 transition-colors"
        >
          <PhoneCall className="h-4 w-4 shrink-0" />
          <span>Construtor BANT &amp; Script</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
        </a>
        <a
          href={SPIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600/10 hover:bg-violet-600/20 text-violet-700 transition-colors"
        >
          <TrendingUp className="h-4 w-4 shrink-0" />
          <span>Construtor SPIN Selling</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
        </a>
        <a
          href={CONSELHO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 transition-colors"
        >
          <Lightbulb className="h-4 w-4 shrink-0" />
          <span>Conselho Templum Evolutto</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
        </a>
      </div>
    </>
  );
}
