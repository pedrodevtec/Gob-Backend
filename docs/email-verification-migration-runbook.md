# Deploy da migration 20260729120000_add_email_verification

Runbook operacional para aplicar a migration de confirmacao de e-mail sem bloquear usuarios existentes.

## Antes

- Ativar manutencao ou interromper temporariamente novos cadastros.
- Confirmar que existe backup recente e restauravel do banco.
- Conferir que a versao da aplicacao preparada inclui a confirmacao obrigatoria de e-mail.
- Registrar a contagem total de usuarios antes da migration.
- Se a coluna `emailVerifiedAt` ja existir, registrar quantos usuarios ainda possuem `emailVerifiedAt` nulo.

## Aplicacao

- Usar o comando oficial de migration de producao do Prisma:

```bash
npx prisma migrate deploy
```

- Nao usar `prisma migrate dev` em producao.
- Nao usar reset de banco.
- Manter novos cadastros interrompidos enquanto a migration e validada.
- Observar possiveis locks na tabela `User`, especialmente durante o `ALTER TABLE` e o backfill dos usuarios existentes.

## Validacao

- Confirmar que a coluna `User.emailVerifiedAt` existe.
- Confirmar que a tabela `EmailVerificationToken` existe.
- Confirmar o indice unico em `EmailVerificationToken.tokenHash`.
- Confirmar o indice em `EmailVerificationToken(userId, consumedAt, expiresAt)`.
- Confirmar a foreign key `EmailVerificationToken.userId -> User.id` com `ON DELETE CASCADE`.
- Confirmar que usuarios preexistentes estao com `emailVerifiedAt` preenchido.
- Se algum usuario preexistente tiver sido criado entre o backfill e o deploy, executar backfill final seguro apenas para essas contas antes de liberar cadastros.
- Publicar a nova aplicacao.
- Fazer smoke test de cadastro, confirmacao, reenvio e login.

## Rollback

- Nao remover automaticamente a coluna `emailVerifiedAt` ou a tabela `EmailVerificationToken`.
- Em falha da aplicacao, restaurar a versao anterior mantendo a estrutura de banco compatível.
- Avaliar restauracao de backup somente diante de corrupcao ou falha irrecuperavel.
- Rollback destrutivo exige decisao humana explicita.
