# Deploy — Método Ponto B (Render + Neon)

Arquitetura: **um único serviço no Render** roda o servidor Express, que também
serve o frontend React já compilado. O banco PostgreSQL fica no **Neon** (grátis).

```
Render (web service)  →  Express + frontend React (mesmo domínio)
Neon                  →  PostgreSQL
```

---

## 1. Criar o banco no Neon

1. Acesse https://neon.tech e crie uma conta (pode logar com GitHub).
2. **Create project** → nome `pontob`, região mais perto (ex.: AWS US East).
3. Copie a **connection string** (formato `postgresql://user:pass@host/db?sslmode=require`).
   - Use a string **pooled** (com `-pooler` no host) se houver — ideal pra serverless.

Guarde essa string: é o `DATABASE_URL`.

## 2. Subir o schema e popular o banco (uma vez)

Pode ser feito da sua máquina (precisa de Node + pnpm) apontando pro Neon:

```bash
export DATABASE_URL="postgresql://...sua string do neon..."
pnpm install
pnpm --filter @workspace/db run push    # cria as tabelas
pnpm --filter @workspace/db run seed     # popula dimensões, iniciativas e usuários de teste
```

> A tabela `session` (login) é criada automaticamente pelo servidor no primeiro start.

Credenciais de teste criadas pelo seed:
- `acramrajab@remax.com.br` / `admin123` (master_admin)
- `franqueado@remaxsc.com.br` / `franqueado123` (franqueado)

## 3. Deploy no Render

1. Acesse https://render.com e crie conta (logue com GitHub).
2. **New → Blueprint**, conecte o repositório `AcramRajab/pontob` e selecione a
   branch `deploy/render` (onde está o `render.yaml`).
3. O Render lê o `render.yaml` e cria o serviço `pontob`. Ele vai pedir os valores
   marcados como "sync: false":
   - **DATABASE_URL** → cole a string do Neon (passo 1).
   - **REPLIT_DOMAINS** → deixe em branco por enquanto (preencha no passo 4).
   - Opcionais (e-mail/IA) → deixe em branco se não for usar.
4. Após o primeiro deploy, o Render te dá uma URL tipo `https://pontob.onrender.com`.
   Volte em **Environment** e preencha `REPLIT_DOMAINS = pontob.onrender.com`
   (sem `https://`) pra que links de convite/e-mail fiquem corretos. Salve → redeploy.

Pronto. Abra a URL e faça login com as credenciais de teste.

---

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|----------|-------------|----------|
| `DATABASE_URL` | ✅ | Conexão com o Postgres (Neon) |
| `SESSION_SECRET` | ✅ (auto) | Segredo das sessões — o Render gera sozinho |
| `NODE_ENV` | ✅ | `production` (já no render.yaml) |
| `BASE_PATH` | ✅ | `/` (já no render.yaml) |
| `PORT` | ✅ | porta do servidor (já no render.yaml) |
| `REPLIT_DOMAINS` | recomendada | host público p/ links em e-mails (ex.: `pontob.onrender.com`) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | opcional | envio de e-mails (lembretes/convites) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` / `_BASE_URL` | opcional | recursos de IA (assistente/coaching) |

## Observações

- **Plano free do Render dorme** após ~15 min sem uso; a primeira visita seguinte
  leva ~30–50s pra acordar. Pra evitar, suba pro plano pago (~US$ 7/mês).
- **Recursos de IA** só funcionam com chave OpenAI configurada; sem ela, o app sobe
  normal e só as telas de IA avisam que estão indisponíveis.
- **ffmpeg** é necessário só para os recursos de áudio/transcrição da IA.
</content>
