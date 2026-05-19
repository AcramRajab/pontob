import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Send, BookOpen, RefreshCw, Target, TrendingUp, AlertCircle } from "lucide-react";

interface Message { role: "assistant" | "user"; content: string; }

const EXAMPLE_QUESTIONS = [
  "Por que estou falhando nos meus check-ins mesmo tendo boa intenção?",
  "Tenho muitas metas. Quais critérios usar para priorizar?",
  "Como transformar bloqueadores recorrentes em plano de ação?",
  "Qual a frequência ideal de revisão de iniciativas estratégicas?",
  "Como manter consistência de execução ao longo do ano?",
];

function formatContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} className="font-bold text-slate-900 mt-4 first:mt-0">{line.replace(/\*\*/g, "")}</p>;
    }
    if (line.startsWith("##")) {
      return <p key={i} className="font-semibold text-slate-700 mt-3 text-sm uppercase tracking-wide">{line.replace(/##\s?/, "")}</p>;
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      return <p key={i} className="pl-3 border-l-2 border-indigo-200 text-slate-700 text-sm my-1">{line.replace(/^[-•]\s/, "")}</p>;
    }
    if (line.includes("[Fonte:")) {
      const parts = line.split(/(\[Fonte:[^\]]+\])/g);
      return (
        <p key={i} className="text-sm text-slate-700 my-1">
          {parts.map((part, j) =>
            part.startsWith("[Fonte:") ? (
              <span key={j} className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-1.5 py-0.5 mx-1">
                <BookOpen className="h-2.5 w-2.5 shrink-0" />{part.replace(/^\[Fonte:\s?/, "").replace(/\]$/, "")}
              </span>
            ) : part
          )}
        </p>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm text-slate-700 my-1">{line}</p>;
  });
}

export default function Coaching() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [autoAnalyzing, setAutoAnalyzing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function runStream(question?: string) {
    const isAuto = !question;
    if (isAuto) setAutoAnalyzing(true);
    setStreaming(true);

    const userMsg: Message | null = question ? { role: "user", content: question } : null;
    if (userMsg) setMessages(prev => [...prev, userMsg]);

    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const body: Record<string, any> = { franchiseId: user?.franchiseId };
      if (question) body.question = question;

      const resp = await fetch("/api/ai/coaching", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(await resp.text());

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(part.slice(6));
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
            if (payload.done || payload.error) break;
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Erro: ${err.message}` };
        return updated;
      });
    } finally {
      setStreaming(false);
      setAutoAnalyzing(false);
    }
  }

  function handleSend() {
    if (!input.trim() || streaming) return;
    const q = input.trim();
    setInput("");
    runStream(q);
  }

  function handleExample(q: string) {
    if (streaming) return;
    runStream(q);
  }

  function handleReset() {
    setMessages([]);
    setInput("");
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Coaching Estratégico</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Análise baseada em evidências científicas · Cada resposta cita a fonte
            </p>
          </div>
          <div className="flex gap-2">
            {!isEmpty && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                <RefreshCw className="h-3 w-3" /> Nova sessão
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => runStream()}
              disabled={streaming || autoAnalyzing}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs"
            >
              {autoAnalyzing
                ? <><Loader2 className="h-3 w-3 animate-spin" />Analisando…</>
                : <><Sparkles className="h-3 w-3" />Analisar meus dados</>
              }
            </Button>
          </div>
        </div>

        {/* science badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {["Locke & Latham (2002)", "James Clear (2018)", "Gary Keller (2013)", "Cal Newport (2016)", "Jim Collins (2001)"].map(s => (
            <span key={s} className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-full px-2 py-0.5">
              <BookOpen className="h-2.5 w-2.5" />{s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {isEmpty && (
          <div className="space-y-6 pt-4">
            {/* intro cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Target, title: "Foco", desc: "Quantas metas é ideal? A ciência responde." },
                { icon: TrendingUp, title: "Execução", desc: "Padrões dos seus check-ins analisados." },
                { icon: AlertCircle, title: "Bloqueadores", desc: "Transforme obstáculos em plano de ação." },
              ].map(c => (
                <div key={c.title} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <c.icon className="h-6 w-6 mx-auto text-indigo-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{c.desc}</p>
                </div>
              ))}
            </div>

            {/* example questions */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Perguntas sugeridas</p>
              <div className="space-y-2">
                {EXAMPLE_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => handleExample(q)}
                    disabled={streaming}
                    className="w-full text-left text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center mr-2.5 mt-0.5 shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-indigo-600 text-white text-sm rounded-tr-sm"
                : "bg-white border border-slate-100 shadow-sm rounded-tl-sm"
            }`}>
              {msg.role === "user"
                ? <p className="text-sm">{msg.content}</p>
                : msg.content
                  ? <div className="space-y-0.5">{formatContent(msg.content)}</div>
                  : <div className="flex items-center gap-1.5 text-slate-400 text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin" />Pensando…</div>
              }
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-6 pb-6 pt-3 border-t border-slate-100 shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Faça uma pergunta estratégica…"
              disabled={streaming}
              rows={1}
              className="w-full resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 bg-white"
              style={{ minHeight: 44, maxHeight: 120, overflowY: "auto" }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="h-11 w-11 p-0 shrink-0 bg-indigo-600 hover:bg-indigo-700"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-slate-300 mt-2 text-center">
          Respostas embasadas em ciência. Fontes citadas em cada orientação.
        </p>
      </div>
    </div>
  );
}
