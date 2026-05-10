import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface VagaAiPanelProps {
  vagaId: number;
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="font-semibold text-sm mt-4 mb-1.5 text-foreground">
          {line.replace("## ", "")}
        </h3>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="font-medium text-xs mt-3 mb-1 text-foreground">
          {line.replace("### ", "")}
        </h4>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 mb-2">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-xs text-foreground/90">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 mb-2">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-xs text-foreground/90">
              <span className="shrink-0 font-medium text-primary/70">{j + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p key={i} className="text-xs text-foreground/90 mb-1 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    }
    i++;
  }
  return <>{elements}</>;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>');
}

function ChatMessage({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-xs">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[92%] bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
        <MarkdownBlock text={msg.content} />
      </div>
    </div>
  );
}

async function streamFetch(
  url: string,
  body: object,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    onError("Erro ao conectar com o servidor.");
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.content) onChunk(data.content);
        if (data.done) onDone();
        if (data.error) onError(data.error);
      } catch {}
    }
  }
}

export function VagaAiPanel({ vagaId }: VagaAiPanelProps) {
  const [plan, setPlan] = useState<string>("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planDone, setPlanDone] = useState(false);
  const [planCollapsed, setPlanCollapsed] = useState(false);

  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading, plan]);

  const generatePlan = async () => {
    setPlan("");
    setPlanLoading(true);
    setPlanDone(false);
    setPlanCollapsed(false);
    let accumulated = "";
    await streamFetch(
      `/api/recruiting/vagas/${vagaId}/ai-plan`,
      {},
      (chunk) => {
        accumulated += chunk;
        setPlan(accumulated);
      },
      () => {
        setPlanLoading(false);
        setPlanDone(true);
      },
      (err) => {
        setPlan(err);
        setPlanLoading(false);
      }
    );
  };

  const sendChat = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setChatHistory((h) => [...h, userMsg]);
    setChatLoading(true);
    let accumulated = "";
    const placeholderIdx = chatHistory.length + 1;
    setChatHistory((h) => [...h, { role: "assistant", content: "" }]);
    await streamFetch(
      `/api/recruiting/vagas/${vagaId}/ai-chat`,
      {
        message: text,
        history: [...chatHistory, userMsg].map((m) => ({ role: m.role, content: m.content })),
      },
      (chunk) => {
        accumulated += chunk;
        setChatHistory((h) => {
          const updated = [...h];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      },
      () => setChatLoading(false),
      (err) => {
        setChatHistory((h) => {
          const updated = [...h];
          updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${err}` };
          return updated;
        });
        setChatLoading(false);
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Plan section */}
      {!plan && !planLoading && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Plano de Busca com IA</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              A IA analisa o perfil da vaga e gera um plano completo com perfil ideal do candidato,
              estratégias de busca, queries prontas e perguntas de qualificação.
            </p>
            <Button onClick={generatePlan}>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Plano de Busca
            </Button>
          </CardContent>
        </Card>
      )}

      {(plan || planLoading) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Plano de Busca</span>
                {planLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-1">
                {planDone && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={generatePlan}>
                    <RefreshCw className="h-3 w-3" />
                    Regerar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setPlanCollapsed((c) => !c)}
                >
                  {planCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            {!planCollapsed && (
              <div className="prose-sm max-w-none">
                <MarkdownBlock text={plan} />
                {planLoading && (
                  <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse rounded ml-0.5 align-middle" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chat section */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Perguntar à IA</span>
          </div>

          {chatHistory.length > 0 && (
            <ScrollArea className="h-72 mb-3 pr-1">
              {chatHistory.map((msg, i) => (
                <ChatMessage key={i} msg={msg} />
              ))}
              {chatLoading && chatHistory[chatHistory.length - 1]?.content === "" && (
                <div className="flex justify-start mb-3">
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </ScrollArea>
          )}

          <div className="flex gap-2">
            <Textarea
              rows={2}
              placeholder="Pergunte sobre estratégias de busca, qualificação de candidatos, como abordar o perfil desta vaga..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              className="text-sm resize-none"
            />
            <Button
              size="icon"
              onClick={sendChat}
              disabled={chatLoading || !input.trim()}
              className="h-auto shrink-0"
            >
              {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Exemplos: "Onde encontrar corretores experientes em SC?", "Que perguntas fazer na entrevista?", "Como avaliar candidatos desta vaga?"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
