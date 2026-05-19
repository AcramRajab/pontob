import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, X, Loader2, RotateCcw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AiAssistantContext } from "./ai-assistant-context";

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
        <div className="px-3 pb-2 shrink-0">
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

export function AiAssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <AiAssistantContext.Provider value={{ openAssistant: () => setOpen(true) }}>
      {children}
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Assistente IA"
          className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}
    </AiAssistantContext.Provider>
  );
}
