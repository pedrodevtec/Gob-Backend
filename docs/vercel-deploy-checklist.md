# Deploy na Vercel

Este checklist cobre as informacoes minimas para publicar o backend do playtest `pilot-v1`.

## Estado atual

- O banco precisa ter migrations aplicadas antes do deploy usar a API.
- A campanha publica `pilot-v1` precisa existir com `status = ACTIVE`.
- A mesa vinculada precisa estar com `status = RECRUITING`.
- O seed promove o unico usuario existente para `ADMIN` e `MASTER` da mesa piloto quando o banco tem exatamente um usuario.

## Adaptador Vercel

O projeto possui duas entradas:

- `src/server.ts`: inicia `app.listen(...)` para execucao local ou servidor persistente.
- `api/index.ts`: exporta o app Express para Vercel Functions.

O arquivo `vercel.json` direciona todas as rotas para `/api`, mantendo paths como `/health` e `/api/v1/campaigns/public/pilot-v1`.

## Variaveis de ambiente do backend

Configure em Project Settings -> Environment Variables na Vercel.

Obrigatorias:

```env
NODE_ENV=production
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
CORS_ORIGIN=
RESEND_API_KEY=
EMAIL_FROM=
APP_WEB_URL=
```

Recomendadas:

```env
OPENAI_API_KEY=
AI_MODEL=gpt-5-nano
PERMISSION_DEBUG=false
EMAIL_VERIFICATION_TTL_MINUTES=60
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS=60
```

Opcionais/legadas:

```env
PORT=5000
PAYMENT_WEBHOOK_SECRET=
```

## Como preencher

- `DATABASE_URL`: URL pooled do Supabase para runtime da API.
- `DIRECT_URL`: URL direta do Supabase para Prisma migrations.
- `JWT_SECRET`: segredo forte e exclusivo de producao.
- `CORS_ORIGIN`: origem exata do frontend, por exemplo `https://seu-front.vercel.app`. Evite `*` em producao.
- `APP_WEB_URL`: URL publica do frontend usada em links de e-mail.
- `RESEND_API_KEY`: chave server-side do Resend.
- `EMAIL_FROM`: remetente verificado no provedor de e-mail.
- `OPENAI_API_KEY`: chave server-side da OpenAI. Nunca use prefixo publico no frontend.

## Ordem de deploy

1. Configurar variaveis na Vercel para Production e Preview conforme necessario.
2. Aplicar migrations no banco:

```bash
npx prisma migrate deploy
```

3. Rodar seed para garantir `pilot-v1`:

```bash
npm run prisma:seed
```

4. Fazer deploy/redeploy na Vercel.
5. Validar:

```bash
GET /health
GET /ready
GET /api/v1/campaigns/public/pilot-v1
```

## Comandos de build

O script `npm run build` executa `prisma generate` antes de `tsc`.

Na Vercel, use:

```bash
npm run build
```

Nao rode `prisma migrate deploy` ou `npm run prisma:seed` dentro do build da Vercel. Execute esses comandos antes do deploy, com acesso controlado ao banco.

## Seguranca

- Marque segredos como sensiveis na Vercel quando disponivel.
- Nunca publique `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `RESEND_API_KEY` ou `PAYMENT_WEBHOOK_SECRET` no frontend.
- Nao use `CORS_ORIGIN=*` em producao.
- O rate limit atual e em memoria; para Vercel/multiplas instancias, usar store compartilhado como Redis.
- O endpoint administrativo de operacoes retorna `dossierSubmissions` para admin. Nao expor essa resposta a usuarios finais.
