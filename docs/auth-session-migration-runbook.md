# Runbook — sessões persistentes da Story 1.2

## Aplicação

1. Fazer backup e impedir rollout parcial do login novo sem a contraparte frontend.
2. O build de produção da Vercel executa `npm run db:migrate:deploy` antes de
   compilar. Se a migration falhar, o deploy deve falhar sem promover a nova
   aplicação. Preview builds não aplicam DDL.
3. Publicar o backend e conferir `/docs.json`, login, refresh, logout e `me`.
4. Publicar a fronteira BFF da issue frontend #32 no mesmo change window.
5. Confirmar que nenhuma credencial aparece em logs e que `Cache-Control` é `no-store`.

A migration é aditiva. Ela cria `AuthSession`, `AuthRefreshToken`, índices, chaves
estrangeiras e triggers para revogação em alteração de papel ou membership.
Produção rejeita JWT legado sem `sid`. Desenvolvimento mantém uma ponte temporária
para fixtures antigas; ela não é habilitada quando `NODE_ENV=production`.

## Rollback

Não voltar para o middleware JWT legado após sessões novas terem sido emitidas:
isso faria tokens revogados voltarem a funcionar. Em incidente, interromper login
e convites, manter as tabelas e corrigir/avançar a aplicação.

O arquivo `rollback.sql` existe para ambientes descartáveis ou reversão controlada
antes da emissão de qualquer sessão nova. Ele remove triggers, tabelas e enum e
destrói o histórico de revogação; requer backup, janela aprovada e aplicação antiga
ativa. Prisma não executa esse arquivo automaticamente.

## Evidência mínima

- migration aplicada e Prisma Client gerado;
- 200/401/403/409 conforme contrato;
- exatamente um sucessor em refresh concorrente;
- reuse após cinco segundos revoga a família;
- logout por predecessor revoga o sucessor;
- access token rejeitado após logout, mudança de papel ou membership;
- refresh token ausente nos logs e persistido somente como SHA-256;
- matriz E2E frontend/backend/banco registrada sem tokens ou senhas.
