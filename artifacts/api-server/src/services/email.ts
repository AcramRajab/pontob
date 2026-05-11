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
