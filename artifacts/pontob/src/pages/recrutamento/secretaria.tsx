import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bot, Send, Loader2, Sparkles, Clock, AlertCircle,
  MessageSquare, CalendarCheck, TriangleAlert, RefreshCw, Copy, Check
} from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface CandidatoWithMeta {
  id: number;
  vagaId: number;
  vagaTitle: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  currentRole: string | null;
  notes: string | null;
  stage: string;
  recommendation: string | null;
  daysSinceUpdate: number;
  updatedAt: string;
  createdAt: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const stageLabel: Record<string, string> = {
  interessado: "Interessado",
  triagem: "Em triagem",
  entrevista: "Em entrevista",
  proposta: "Proposta enviada",
  contratado: "Contratado",
  descartado: "Descartado",
};

const MESSAGE_TYPES = [
  { value: "convite_entrevista", label: "Convite para entrevista" },
  { value: "follow_up", label: "Follow-up (sem resposta)" },
  { value: "confirmacao_entrevista", label: "Confirmação de entrevista" },
  { value: "proposta", label: "Proposta de trabalho" },
  { value: "rejeicao", label: "Rejeição empática" },
];

function urgencyLevel(c: CandidatoWithMeta): "red" | "yellow" | "green" {
  if (c.stage === "descartado" || c.stage === "contratado") return "green";
  if (c.daysSinceUpdate >= 5) return "red";
  if (c.daysSinceUpdate >= 2) return "yellow";
  return "green";
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ") || line.startsWith("### ")) {
      const level = line.startsWith("### ") ? 4 : 3;
      const content = line.replace(/^#{2,3} /, "");
      elements.push(
        level === 3
          ? <h3 key={i} className="font-semibold text-sm mt-4 mb-1.5 text-foreground">{content}</h3>
          : <h4 key={i} className="font-medium text-xs mt-3 mb-1 text-foreground">{content}</h4>
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
              <span dangerouslySetInnerHTML={{ __html: fmtInline(item) }} />
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
              <span dangerouslySetInnerHTML={{ __html: fmtInline(item) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].match(/^\|[-| ]+\|$/)) {
          rows.push(lines[i].split("|").filter(Boolean).map((c) => c.trim()));
        }
        i++;
      }
      if (rows.length > 0) {
        elements.push(
          <div key={`tbl-${i}`} className="overflow-x-auto mb-2">
            <table className="text-xs w-full border-collapse">
              {rows.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? "font-semibold border-b border-border" : "border-b border-border/40"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-1 pr-3 text-foreground/90">{cell}</td>
                  ))}
                </tr>
              ))}
            </table>
          </div>
        );
      }
      continue;
    } else if (line.trim() === "" || line.startsWith("---")) {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p key={i} className="text-xs text-foreground/90 mb-1 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: fmtInline(line) }} />
      );
    }
    i++;
  }
  return <>{elements}</>;
}

function fmtInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>');
}

async function streamFetch(
  url: string,
  body: object,
  onChunk: (c: string) => void,
  onDone: () => void,
  onError: (m: string) => void
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) { onError("Erro ao conectar com o servidor."); return; }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function Secretaria() {
  const { franchiseId } = useFranchiseContext();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: candidatos = [], isLoading, refetch } = useQuery<CandidatoWithMeta[]>({
    queryKey: ["secretary-candidatos", franchiseId],
    queryFn: async () => {
      const qs = franchiseId ? `?franchiseId=${franchiseId}` : "";
      const r = await fetch(`/api/recruiting/candidatos${qs}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    enabled: true,
  });

  const urgentCandidatos = candidatos.filter((c) => urgencyLevel(c) === "red");
  const attentionCandidatos = candidatos.filter((c) => urgencyLevel(c) === "yellow");
  const activeCandidatos = candidatos.filter(
    (c) => c.stage !== "descartado" && c.stage !== "contratado"
  );
  const interviewCandidatos = candidatos.filter((c) => c.stage === "entrevista");

  // --- Mensagens tab state ---
  const [selCandidato, setSelCandidato] = useState<string>("");
  const [msgType, setMsgType] = useState<string>("");
  const [msgText, setMsgText] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);

  const generateMsg = async () => {
    if (!selCandidato || !msgType) return;
    setMsgText("");
    setMsgLoading(true);
    let acc = "";
    await streamFetch(
      `/api/recruiting/candidatos/${selCandidato}/draft-message`,
      { type: msgType },
      (c) => { acc += c; setMsgText(acc); },
      () => setMsgLoading(false),
      (e) => { toast({ title: "Erro", description: e, variant: "destructive" }); setMsgLoading(false); }
    );
  };

  // --- Entrevistas tab state ---
  const [selInterview, setSelInterview] = useState<string>("");
  const [agendaText, setAgendaText] = useState("");
  const [agendaLoading, setAgendaLoading] = useState(false);

  const generateAgenda = async () => {
    if (!selInterview) return;
    setAgendaText("");
    setAgendaLoading(true);
    let acc = "";
    await streamFetch(
      `/api/recruiting/candidatos/${selInterview}/interview-prep`,
      {},
      (c) => { acc += c; setAgendaText(acc); },
      () => setAgendaLoading(false),
      (e) => { toast({ title: "Erro", description: e, variant: "destructive" }); setAgendaLoading(false); }
    );
  };

  // --- Secretary chat state ---
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    const userMsg: ChatMsg = { role: "user", content: text };
    setChatHistory((h) => [...h, userMsg, { role: "assistant", content: "" }]);
    setChatLoading(true);
    let acc = "";
    await streamFetch(
      "/api/recruiting/secretary/chat",
      { message: text, history: [...chatHistory, userMsg], franchiseId },
      (c) => {
        acc += c;
        setChatHistory((h) => {
          const u = [...h];
          u[u.length - 1] = { role: "assistant", content: acc };
          return u;
        });
      },
      () => setChatLoading(false),
      (e) => {
        setChatHistory((h) => {
          const u = [...h];
          u[u.length - 1] = { role: "assistant", content: `⚠️ ${e}` };
          return u;
        });
        setChatLoading(false);
      }
    );
  };

  const pendingCount = urgentCandidatos.length + attentionCandidatos.length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Secretária IA</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Automação de mensagens, follow-ups e preparação de entrevistas para o recrutamento
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary strip */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          <Card className={urgentCandidatos.length > 0 ? "border-destructive/40 bg-destructive/5" : ""}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className={`h-5 w-5 shrink-0 ${urgentCandidatos.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xl font-bold">{urgentCandidatos.length}</p>
                <p className="text-xs text-muted-foreground">Urgentes (5+ dias)</p>
              </div>
            </CardContent>
          </Card>
          <Card className={attentionCandidatos.length > 0 ? "border-yellow-500/40 bg-yellow-500/5" : ""}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <TriangleAlert className={`h-5 w-5 shrink-0 ${attentionCandidatos.length > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xl font-bold">{attentionCandidatos.length}</p>
                <p className="text-xs text-muted-foreground">Atenção (2-4 dias)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CalendarCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{interviewCandidatos.length}</p>
                <p className="text-xs text-muted-foreground">Em entrevista</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pendencias">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="pendencias" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pendências
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px] ml-0.5">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mensagens" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="entrevistas" className="gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Entrevistas
          </TabsTrigger>
          <TabsTrigger value="secretaria" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Secretária IA
          </TabsTrigger>
        </TabsList>

        {/* ─── Pendências ─── */}
        <TabsContent value="pendencias" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pendingCount === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground mt-1">Nenhum candidato aguarda ação há mais de 2 dias.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {urgentCandidatos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wide flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Urgente — sem movimento há 5+ dias
                  </p>
                  {urgentCandidatos.map((c) => (
                    <PendenciaCard key={c.id} candidato={c} />
                  ))}
                </div>
              )}
              {attentionCandidatos.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide flex items-center gap-1.5">
                    <TriangleAlert className="h-3.5 w-3.5" /> Atenção — sem movimento há 2-4 dias
                  </p>
                  {attentionCandidatos.map((c) => (
                    <PendenciaCard key={c.id} candidato={c} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── Mensagens ─── */}
        <TabsContent value="mensagens" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Redigir mensagem com IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Candidato</label>
                  <Select value={selCandidato} onValueChange={setSelCandidato}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um candidato..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCandidatos.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} — {c.vagaTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tipo de mensagem</label>
                  <Select value={msgType} onValueChange={setMsgType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSAGE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={generateMsg}
                disabled={!selCandidato || !msgType || msgLoading}
                className="w-full"
              >
                {msgLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redigindo...</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Gerar mensagem</>}
              </Button>
            </CardContent>
          </Card>

          {(msgText || msgLoading) && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Rascunho gerado</span>
                    {msgLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                  {!msgLoading && msgText && <CopyButton text={msgText} />}
                </div>
                <ScrollArea className="max-h-96">
                  <div className="prose-sm max-w-none">
                    <MarkdownBlock text={msgText} />
                    {msgLoading && (
                      <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse rounded ml-0.5 align-middle" />
                    )}
                  </div>
                </ScrollArea>
                {!msgLoading && msgText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-xs text-muted-foreground"
                    onClick={generateMsg}
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Gerar nova versão
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Entrevistas ─── */}
        <TabsContent value="entrevistas" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preparar agenda de entrevista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Candidato em entrevista</label>
                <Select value={selInterview} onValueChange={setSelInterview}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um candidato em entrevista..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCandidatos.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} — {c.vagaTitle}
                        {c.stage === "entrevista" && (
                          <span className="ml-1 text-xs text-primary">(em entrevista)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeCandidatos.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum candidato ativo encontrado.</p>
                )}
              </div>
              <Button
                onClick={generateAgenda}
                disabled={!selInterview || agendaLoading}
                className="w-full"
              >
                {agendaLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparando agenda...</>
                  : <><CalendarCheck className="h-4 w-4 mr-2" />Gerar agenda de entrevista</>}
              </Button>
            </CardContent>
          </Card>

          {(agendaText || agendaLoading) && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Agenda gerada</span>
                    {agendaLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                  {!agendaLoading && agendaText && <CopyButton text={agendaText} />}
                </div>
                <ScrollArea className="max-h-[32rem]">
                  <div className="prose-sm max-w-none">
                    <MarkdownBlock text={agendaText} />
                    {agendaLoading && (
                      <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse rounded ml-0.5 align-middle" />
                    )}
                  </div>
                </ScrollArea>
                {!agendaLoading && agendaText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-xs text-muted-foreground"
                    onClick={generateAgenda}
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Regerar agenda
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Secretária IA chat ─── */}
        <TabsContent value="secretaria" className="mt-4">
          <Card className="flex flex-col" style={{ height: "560px" }}>
            <CardHeader className="pb-3 border-b shrink-0">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Secretária IA</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Assistente completa para todas as tarefas de recrutamento
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden pt-4 pb-4">
              <ScrollArea className="flex-1 pr-1 mb-3">
                {chatHistory.length === 0 ? (
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground/80 mb-3">Exemplos do que posso fazer por você:</p>
                    {[
                      "Quais candidatos precisam de follow-up hoje?",
                      "Crie uma cadência de follow-up de 7 dias para candidatos em triagem",
                      "Resuma o status atual do meu pipeline de recrutamento",
                      "Qual a melhor ordem para entrevistar os candidatos em entrevista?",
                      "Crie um template de WhatsApp para marcar entrevistas",
                    ].map((ex, i) => (
                      <button
                        key={i}
                        className="w-full text-left px-3 py-2 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors text-xs"
                        onClick={() => { setChatInput(ex); }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div key={i} className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "user" ? (
                        <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-xs">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="max-w-[92%] bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                          {msg.content === "" && chatLoading
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            : <MarkdownBlock text={msg.content} />}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </ScrollArea>
              <div className="flex gap-2 shrink-0">
                <Textarea
                  rows={2}
                  placeholder="Ex: Quais candidatos precisam de ação hoje? Crie um follow-up para..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
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
                  disabled={chatLoading || !chatInput.trim()}
                  className="h-auto shrink-0"
                >
                  {chatLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendenciaCard({ candidato }: { candidato: CandidatoWithMeta }) {
  const level = urgencyLevel(candidato);
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm
      ${level === "red" ? "border-destructive/30 bg-destructive/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-2 w-2 rounded-full shrink-0 ${level === "red" ? "bg-destructive" : "bg-yellow-500"}`} />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{candidato.name}</p>
          <p className="text-xs text-muted-foreground truncate">{candidato.vagaTitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <Badge variant="secondary" className="text-xs">
          {stageLabel[candidato.stage] || candidato.stage}
        </Badge>
        <span className={`text-xs font-medium whitespace-nowrap ${level === "red" ? "text-destructive" : "text-yellow-600"}`}>
          {candidato.daysSinceUpdate}d sem atualização
        </span>
      </div>
    </div>
  );
}
