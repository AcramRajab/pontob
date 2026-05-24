import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let _transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter(): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transporter;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });
}

export async function sendInterviewReminder(opts: {
  toEmail: string;
  toName: string;
  candidatoName: string;
  vagaTitle: string;
  franchiseName: string;
  interviewAt: string;
  phone: string | null;
}) {
  if (!isEmailConfigured()) return;
  const wa = opts.phone
    ? `https://wa.me/${opts.phone.replace(/\D/g, "").replace(/^(?!55)/, "55")}`
    : null;

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: `🎤 Entrevista hoje: ${opts.candidatoName} — ${opts.vagaTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#111;">
        <h2 style="color:#1e40af;margin-bottom:4px;">Entrevista agendada</h2>
        <p style="color:#6b7280;margin-top:0;">${opts.franchiseName}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
        <p><strong>Candidato:</strong> ${opts.candidatoName}</p>
        <p><strong>Vaga:</strong> ${opts.vagaTitle}</p>
        <p><strong>Horário:</strong> ${formatDateTime(opts.interviewAt)}</p>
        ${wa ? `<p><strong>Contato:</strong> <a href="${wa}" style="color:#16a34a;">${opts.phone}</a></p>` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
        <p style="font-size:12px;color:#9ca3af;">Método Ponto B — RE/MAX SC</p>
      </div>
    `,
  });
}

export async function sendWeeklyDigest(opts: {
  toEmail: string;
  toName: string;
  franchiseName: string;
  candidatos: { name: string; vagaTitle: string; stage: string; daysSinceUpdate: number }[];
}) {
  if (!isEmailConfigured()) return;

  const stageLabel: Record<string, string> = {
    interessado: "Interessado", triagem: "Triagem", entrevista: "Entrevista",
    proposta: "Proposta", contratado: "Contratado", arquivado: "Arquivado",
  };

  const urgent = opts.candidatos.filter((c) => c.daysSinceUpdate >= 5);
  const rows = opts.candidatos
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
    .map((c) => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:8px 4px;">${c.name}</td>
        <td style="padding:8px 4px;color:#6b7280;">${c.vagaTitle}</td>
        <td style="padding:8px 4px;">${stageLabel[c.stage] || c.stage}</td>
        <td style="padding:8px 4px;color:${c.daysSinceUpdate >= 5 ? "#dc2626" : c.daysSinceUpdate >= 2 ? "#ca8a04" : "#16a34a"};">
          ${c.daysSinceUpdate}d
        </td>
      </tr>
    `).join("");

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: `📋 Resumo semanal de recrutamento — ${opts.franchiseName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <h2 style="color:#1e40af;margin-bottom:4px;">Resumo semanal — Recrutamento</h2>
        <p style="color:#6b7280;margin-top:0;">${opts.franchiseName}</p>
        ${urgent.length > 0 ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px 16px;border-radius:8px;margin:16px 0;">
            <strong style="color:#dc2626;">⚠️ ${urgent.length} candidato${urgent.length > 1 ? "s" : ""} sem movimento há 5+ dias</strong>
          </div>
        ` : ""}
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#f9fafb;text-align:left;">
              <th style="padding:8px 4px;font-size:12px;color:#6b7280;">Candidato</th>
              <th style="padding:8px 4px;font-size:12px;color:#6b7280;">Vaga</th>
              <th style="padding:8px 4px;font-size:12px;color:#6b7280;">Estágio</th>
              <th style="padding:8px 4px;font-size:12px;color:#6b7280;">Inativo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
        <p style="font-size:12px;color:#9ca3af;">Método Ponto B — RE/MAX SC</p>
      </div>
    `,
  });
}

export async function sendAuditNotification(opts: {
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityName: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}) {
  if (!isEmailConfigured()) return;

  const actionLabel: Record<string, string> = {
    create: "Criou", update: "Atualizou", delete: "Excluiu",
  };
  const entityLabel: Record<string, string> = {
    franchise: "Franquia", user: "Usuário", goal: "Meta",
    initiative: "Iniciativa", kri: "KRI",
  };

  const changesHtml = opts.oldData && opts.newData
    ? Object.keys(opts.newData)
        .filter(k => JSON.stringify(opts.oldData![k]) !== JSON.stringify(opts.newData![k]))
        .map(k => `
          <tr>
            <td style="padding:6px 8px;font-weight:500;color:#374151;border-bottom:1px solid #f3f4f6;">${k}</td>
            <td style="padding:6px 8px;color:#dc2626;border-bottom:1px solid #f3f4f6;text-decoration:line-through;">${String(opts.oldData![k] ?? "—")}</td>
            <td style="padding:6px 8px;color:#16a34a;border-bottom:1px solid #f3f4f6;">${String(opts.newData![k] ?? "—")}</td>
          </tr>
        `).join("")
    : "";

  const now = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: "acramrajab@remax.com.br",
    subject: `⚙️ Equipe Regional: ${actionLabel[opts.action] || opts.action} ${entityLabel[opts.entityType] || opts.entityType} — ${opts.entityName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <h2 style="color:#1e40af;margin-bottom:4px;">Modificação por Equipe Regional</h2>
        <p style="color:#6b7280;margin-top:0;">${now}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
        <p><strong>Responsável:</strong> ${opts.actorName} (${opts.actorEmail})</p>
        <p><strong>Ação:</strong> ${actionLabel[opts.action] || opts.action} — ${entityLabel[opts.entityType] || opts.entityType}</p>
        <p><strong>Registro:</strong> ${opts.entityName}</p>
        ${changesHtml ? `
          <h3 style="font-size:14px;margin-bottom:8px;color:#374151;">Campos alterados</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:11px;">CAMPO</th>
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:11px;">ANTES</th>
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:11px;">DEPOIS</th>
              </tr>
            </thead>
            <tbody>${changesHtml}</tbody>
          </table>
        ` : ""}
        ${opts.action === "delete" && opts.oldData ? `
          <h3 style="font-size:14px;margin-bottom:8px;color:#dc2626;">Dados excluídos</h3>
          <pre style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:6px;font-size:12px;overflow:auto;">${JSON.stringify(opts.oldData, null, 2)}</pre>
        ` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
        <p style="font-size:12px;color:#9ca3af;">Você pode desfazer esta ação no painel do Admin Master em <strong>Histórico de Alterações</strong>.</p>
        <p style="font-size:12px;color:#9ca3af;">Método Ponto B — RE/MAX SC</p>
      </div>
    `,
  });
}

export async function sendUserInvitation(opts: {
  toEmail: string;
  toName: string;
  password: string;
  role: string;
  franchiseName?: string | null;
  appUrl?: string;
}) {
  if (!isEmailConfigured()) return;

  const roleLabel: Record<string, string> = {
    franqueado: "Franqueado",
    responsavel_interno: "Responsável Interno",
    staff_regional: "Equipe Regional",
  };

  const url = opts.appUrl || `https://${process.env.REPLIT_DEV_DOMAIN || "app"}/login`;

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: `🎉 Bem-vindo ao Método Ponto B — RE/MAX SC`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <div style="background:#1e40af;padding:32px 24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">Método Ponto B</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">RE/MAX Santa Catarina</p>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px 24px;">
          <h2 style="font-size:18px;margin-top:0;">Olá, ${opts.toName}! 👋</h2>
          <p style="color:#374151;line-height:1.6;">
            Sua conta no <strong>Método Ponto B</strong> foi criada.
            ${opts.franchiseName ? `Você está vinculado(a) à <strong>${opts.franchiseName}</strong>.` : ""}
            Use as credenciais abaixo para fazer seu primeiro acesso:
          </p>

          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Suas credenciais</p>
            <p style="margin:0 0 6px;font-size:15px;"><strong>E-mail:</strong> ${opts.toEmail}</p>
            <p style="margin:0 0 6px;font-size:15px;"><strong>Senha:</strong> <code style="background:#e0f2fe;padding:2px 8px;border-radius:4px;">${opts.password}</code></p>
            <p style="margin:8px 0 0;font-size:12px;color:#0369a1;">Perfil: ${roleLabel[opts.role] || opts.role}</p>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a href="${url}" style="background:#1e40af;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
              Acessar o Método Ponto B →
            </a>
          </div>

          <p style="font-size:13px;color:#6b7280;line-height:1.6;">
            Recomendamos que você altere sua senha após o primeiro acesso em <strong>Configurações → Alterar senha</strong>.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="font-size:12px;color:#9ca3af;margin:0;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
      </div>
    `,
  });
}

export async function sendPlannerReminder(opts: {
  toEmail: string;
  toName: string;
  franchiseName: string;
  weekLabel: string;
  type: "end_of_week" | "start_of_week";
  appUrl?: string;
}) {
  if (!isEmailConfigured()) return;
  const url = (opts.appUrl || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "app"}`) + "/planner";
  const isEnd = opts.type === "end_of_week";
  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: isEnd
      ? `📊 Lembrete: registre os indicadores desta semana — ${opts.franchiseName}`
      : `📋 Semana nova: confira os indicadores da semana passada — ${opts.franchiseName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <div style="background:#1e40af;padding:28px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">Método Ponto B</h1>
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">RE/MAX Santa Catarina</p>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:28px 24px;">
          <h2 style="margin-top:0;font-size:17px;color:#111;">Olá, ${opts.toName}! 👋</h2>
          ${isEnd ? `
            <p style="color:#374151;line-height:1.6;">
              A semana <strong>${opts.weekLabel}</strong> está chegando ao fim.<br/>
              Não esqueça de preencher os indicadores e finalizar o planner para registrar o progresso da sua franquia.
            </p>
            <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin:16px 0;">
              <strong style="color:#92400e;">⏰ Prazo:</strong>
              <span style="color:#78350f;"> Finalize até domingo para que o progresso seja contabilizado corretamente.</span>
            </div>
          ` : `
            <p style="color:#374151;line-height:1.6;">
              Uma nova semana começou!<br/>
              Se você ainda não finalizou os indicadores da semana passada <strong>(${opts.weekLabel})</strong>, ainda dá tempo — abra o planner e registre o que foi realizado.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:16px 0;">
              <strong style="color:#166534;">💡 Dica:</strong>
              <span style="color:#15803d;"> Registros consistentes representam parte da pontuação da sua franquia. Vale a pena manter em dia!</span>
            </div>
          `}
          <div style="text-align:center;margin:24px 0;">
            <a href="${url}" style="background:#1e40af;color:white;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
              Abrir Planner Semanal →
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
          <p style="font-size:12px;color:#9ca3af;margin:0;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
      </div>
    `,
  });
}

export async function sendPlannerWeekSummary(opts: {
  toEmail: string;
  toName: string;
  franchiseName: string;
  weekLabel: string;
  totals: { label: string; total: number; meta: number | null }[];
  gapsText: string | null;
  actionsText: string | null;
  appUrl?: string;
}) {
  if (!isEmailConfigured()) return;

  const rows = opts.totals
    .filter(t => t.total > 0 || t.meta)
    .map(t => {
      const pct = t.meta && t.meta > 0 ? Math.round((t.total / t.meta) * 100) : null;
      const color = pct === null ? "#6b7280" : pct >= 100 ? "#16a34a" : pct >= 60 ? "#ca8a04" : "#dc2626";
      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:8px 6px;">${t.label}</td>
          <td style="padding:8px 6px;text-align:center;font-weight:600;">${t.total.toLocaleString("pt-BR")}</td>
          <td style="padding:8px 6px;text-align:center;color:#6b7280;">${t.meta?.toLocaleString("pt-BR") ?? "—"}</td>
          <td style="padding:8px 6px;text-align:center;font-weight:600;color:${color};">${pct !== null ? pct + "%" : "—"}</td>
        </tr>
      `;
    }).join("");

  const url = (opts.appUrl || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "app"}`) + "/planner";

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: `✅ Planner finalizado — ${opts.franchiseName} — ${opts.weekLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <div style="background:#1e40af;padding:28px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">Método Ponto B</h1>
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">Resumo semanal — ${opts.franchiseName}</p>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:28px 24px;">
          <h2 style="margin-top:0;font-size:17px;">Planner Semanal Finalizado ✅</h2>
          <p style="color:#6b7280;">Semana: <strong style="color:#111;">${opts.weekLabel}</strong></p>
          ${rows ? `
            <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;">
              <thead>
                <tr style="background:#f9fafb;text-align:left;">
                  <th style="padding:8px 6px;color:#6b7280;font-size:11px;">INDICADOR</th>
                  <th style="padding:8px 6px;color:#6b7280;font-size:11px;text-align:center;">REALIZADO</th>
                  <th style="padding:8px 6px;color:#6b7280;font-size:11px;text-align:center;">META</th>
                  <th style="padding:8px 6px;color:#6b7280;font-size:11px;text-align:center;">%</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          ` : '<p style="color:#9ca3af;">Nenhum indicador registrado nesta semana.</p>'}
          ${opts.gapsText ? `
            <div style="margin-top:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;">
              <strong style="color:#991b1b;font-size:13px;">⚠️ Gaps identificados</strong>
              <p style="color:#374151;margin:8px 0 0;font-size:13px;white-space:pre-wrap;">${opts.gapsText}</p>
            </div>
          ` : ""}
          ${opts.actionsText ? `
            <div style="margin-top:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;">
              <strong style="color:#166534;font-size:13px;">✅ Ações da próxima semana</strong>
              <p style="color:#374151;margin:8px 0 0;font-size:13px;white-space:pre-wrap;">${opts.actionsText}</p>
            </div>
          ` : ""}
          <div style="text-align:center;margin:24px 0;">
            <a href="${url}" style="background:#1e40af;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
              Ver Planner →
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
          <p style="font-size:12px;color:#9ca3af;margin:0;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
      </div>
    `,
  });
}

export async function sendPlannerWeekReopened(opts: {
  toEmail: string;
  toName: string;
  franchiseName: string;
  weekLabel: string;
  reopenedByName: string;
}) {
  if (!isEmailConfigured()) return;
  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: `⚠️ Semana reaberta — ${opts.franchiseName} (${opts.weekLabel})`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#111;">
        <h2 style="color:#d97706;margin-bottom:4px;">Semana reaberta para correção</h2>
        <p style="color:#6b7280;margin-top:0;">${opts.franchiseName}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
        <p>A semana <strong>${opts.weekLabel}</strong> foi reaberta por <strong>${opts.reopenedByName}</strong> para correção de dados.</p>
        <p>Os dados da semana podem ser editados novamente e uma nova finalização será necessária.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
        <p style="font-size:12px;color:#9ca3af;margin:0;">Método Ponto B — RE/MAX Santa Catarina</p>
      </div>
    `,
  });
}

const pontoBSummaryHtml = `
  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:18px 20px;margin:20px 0;">
    <p style="margin:0 0 8px;font-size:13px;color:#0369a1;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">O que é o Método Ponto B?</p>
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.6;">
      O <strong>Método Ponto B</strong> é uma plataforma de execução estratégica criada para franquias RE/MAX SC.
      Ela conecta as metas da franquia às dimensões estratégicas — <strong>Pessoas</strong> e <strong>Real Estate</strong> —
      e permite acompanhar iniciativas, registrar check-ins diários, semanais e mensais, e monitorar a consistência
      de execução em tempo real.
    </p>
    <p style="margin:0;font-size:13px;color:#0369a1;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Resumo do tutorial</p>
    <ol style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#374151;line-height:1.8;">
      <li><strong>Metas</strong> — Defina metas estratégicas vinculadas às dimensões, com KRIs e KPIs.</li>
      <li><strong>Iniciativas</strong> — Adicione até 3 iniciativas por meta a partir do catálogo de 54 opções.</li>
      <li><strong>Check-in Diário</strong> — Registre eventos e contatos executados no dia.</li>
      <li><strong>Planner Semanal</strong> — Preencha indicadores da semana (visitas, captações, vendas…) e finalize.</li>
      <li><strong>Check-in Mensal</strong> — Avalie o progresso das iniciativas e o resultado do mês.</li>
      <li><strong>Dashboard &amp; Ranking</strong> — Acompanhe sua pontuação e compare com outras franquias da rede.</li>
    </ol>
  </div>
`;

export async function sendApprovalRequest(opts: {
  userName: string;
  userEmail: string;
  franchiseName: string;
  role: string;
  roleDisplay?: string;
  approveUrl: string;
  rejectUrl: string;
}) {
  if (!isEmailConfigured()) return;

  const roleLabel: Record<string, string> = {
    franqueado: "Franqueado(a)",
    responsavel_interno: "Responsável Interno",
  };

  const displayRole = opts.roleDisplay ?? roleLabel[opts.role] ?? opts.role;

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: "acramrajab@remax.com.br",
    subject: `🔔 Novo cadastro aguardando aprovação — ${opts.userName} (${opts.franchiseName})`,
    html: `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#111;">
        <div style="background:#1e40af;padding:28px 24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">Método Ponto B</h1>
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">Aprovação de novo usuário</p>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px 24px;">
          <h2 style="font-size:18px;margin-top:0;color:#111;">Novo cadastro aguardando aprovação</h2>
          <p style="color:#374151;line-height:1.6;">Um novo usuário se cadastrou e aguarda sua aprovação antes de poder acessar a plataforma.</p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Dados do cadastro</p>
            <p style="margin:0 0 8px;font-size:15px;"><strong>Nome:</strong> ${opts.userName}</p>
            <p style="margin:0 0 8px;font-size:15px;"><strong>E-mail:</strong> ${opts.userEmail}</p>
            <p style="margin:0 0 8px;font-size:15px;"><strong>Franquia:</strong> ${opts.franchiseName}</p>
            <p style="margin:0;font-size:15px;"><strong>Cargo:</strong> ${displayRole}</p>
          </div>

          <p style="color:#374151;font-size:14px;font-weight:500;">Verifique os dados e aprove ou rejeite o acesso:</p>

          <div style="margin:24px 0;text-align:center;">
            <a href="${opts.approveUrl}"
               style="background:#16a34a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;margin-right:12px;">
              ✅ Aprovar acesso
            </a>
            <a href="${opts.rejectUrl}"
               style="background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
              ❌ Rejeitar cadastro
            </a>
          </div>

          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
            <p style="margin:0;font-size:13px;color:#92400e;">
              <strong>⚠️ Atenção:</strong> Cada botão é de uso único. Ao aprovar, o usuário recebe acesso e e-mail de boas-vindas imediatamente.
              Ao rejeitar, o cadastro é removido permanentemente.
            </p>
          </div>

          ${pontoBSummaryHtml}

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="font-size:12px;color:#9ca3af;margin:0;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
      </div>
    `,
  });
}

export async function sendApprovalGranted(opts: {
  toEmail: string;
  toName: string;
  franchiseName: string;
  role: string;
  appUrl?: string;
}) {
  if (!isEmailConfigured()) return;

  const roleLabel: Record<string, string> = {
    franqueado: "Franqueado(a)",
    responsavel_interno: "Responsável Interno",
  };

  const url = opts.appUrl || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "app"}`;

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: `✅ Seu acesso ao Método Ponto B foi aprovado — ${opts.franchiseName}`,
    html: `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#111;">
        <div style="background:#16a34a;padding:28px 24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">✅ Acesso Aprovado!</h1>
          <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px 24px;">
          <h2 style="font-size:18px;margin-top:0;">Olá, ${opts.toName}! 🎉</h2>
          <p style="color:#374151;line-height:1.6;">
            Seu cadastro no <strong>Método Ponto B</strong> foi revisado e <strong style="color:#16a34a;">aprovado</strong>.
            Você já pode acessar a plataforma com o e-mail e senha que cadastrou.
          </p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <p style="margin:0 0 4px;font-size:13px;color:#166534;"><strong>Franquia:</strong> ${opts.franchiseName}</p>
            <p style="margin:0;font-size:13px;color:#166534;"><strong>Perfil:</strong> ${roleLabel[opts.role] ?? opts.role}</p>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a href="${url}/login" style="background:#1e40af;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
              Acessar o Método Ponto B →
            </a>
          </div>

          ${pontoBSummaryHtml}

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="font-size:12px;color:#9ca3af;margin:0;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
      </div>
    `,
  });
}

export async function sendRejectionNotice(opts: {
  toEmail: string;
  toName: string;
}) {
  if (!isEmailConfigured()) return;

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: `Cadastro não aprovado — Método Ponto B`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <div style="background:#dc2626;padding:28px 24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">Cadastro não aprovado</h1>
          <p style="color:#fecaca;margin:4px 0 0;font-size:13px;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px 24px;">
          <h2 style="font-size:18px;margin-top:0;">Olá, ${opts.toName}.</h2>
          <p style="color:#374151;line-height:1.6;">
            Infelizmente seu cadastro no <strong>Método Ponto B</strong> não foi aprovado pela equipe regional.
          </p>
          <p style="color:#374151;line-height:1.6;">
            Se você acredita que isso foi um engano, entre em contato diretamente com a equipe da RE/MAX Santa Catarina para esclarecimentos.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="font-size:12px;color:#9ca3af;margin:0;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
      </div>
    `,
  });
}

export async function sendAdminError(opts: {
  subject: string;
  context: string;
  details: Record<string, unknown>;
}) {
  if (!isEmailConfigured()) return;

  const now = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });

  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: "acramrajab@remax.com.br",
    subject: `🚨 Erro no sistema: ${opts.subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <div style="background:#dc2626;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:18px;">🚨 Erro no Método Ponto B</h1>
          <p style="color:#fecaca;margin:4px 0 0;font-size:13px;">${now}</p>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:28px 24px;">
          <h2 style="font-size:16px;color:#dc2626;margin-top:0;">${opts.subject}</h2>
          <p style="color:#374151;"><strong>Contexto:</strong> ${opts.context}</p>

          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#991b1b;">Detalhes do erro:</p>
            <pre style="margin:0;font-size:12px;color:#7f1d1d;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(opts.details, null, 2)}</pre>
          </div>

          <p style="font-size:13px;color:#374151;">
            Acesse o painel de administração para investigar e corrigir o problema sem precisar contatar o usuário.
          </p>

          <div style="text-align:center;margin:20px 0;">
            <a href="https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "app"}/admin/users"
               style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
              Acessar painel admin →
            </a>
          </div>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
          <p style="font-size:12px;color:#9ca3af;margin:0;">Método Ponto B — RE/MAX Santa Catarina</p>
        </div>
      </div>
    `,
  });
}

export async function sendCheckinReminder(opts: {
  toEmail: string;
  toName: string;
  franchiseName: string;
  daysSinceLastCheckin: number;
}) {
  if (!isEmailConfigured()) return;
  await getTransporter().sendMail({
    from: `"Método Ponto B" <${process.env.GMAIL_USER}>`,
    to: opts.toEmail,
    subject: `🔔 Lembrete de check-in — ${opts.franchiseName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#111;">
        <h2 style="color:#1e40af;">Faz ${opts.daysSinceLastCheckin} dias sem check-in</h2>
        <p>Olá ${opts.toName}, seus registros no Método Ponto B estão desatualizados.</p>
        <p>Check-ins consistentes representam <strong>20% da sua pontuação</strong>. Não deixe isso impactar seu resultado.</p>
        <p><a href="https://metodoponto b.replit.app/checkin/daily" style="background:#1e40af;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Fazer check-in agora</a></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
        <p style="font-size:12px;color:#9ca3af;">Método Ponto B — RE/MAX SC</p>
      </div>
    `,
  });
}
