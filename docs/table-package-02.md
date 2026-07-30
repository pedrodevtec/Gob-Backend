# Pacote 02 - Mesas, convites e Context por mesa

## Modelo de dominio

`Table` representa uma mesa de playtest criada por um usuario autenticado e verificado. A mesa guarda `Setting`, `Episode` e `ContextVersion` publicados de forma fixada por `settingId`, `episodeId` e `contextVersionId`; a leitura futura nao resolve automaticamente a ultima versao.

`TableMember` representa membership ativa ou removida em uma mesa. `MASTER` e `PLAYER` sao papeis por mesa, nao globais.

`TableInvitation` representa convite por e-mail com `tokenHash` SHA-256, expiracao, status e auditoria de quem convidou/aceitou. Token bruto nao e persistido.

## Lifecycle

Estados de mesa:

- `DRAFT`
- `RECRUITING`
- `PREPARED`
- `IN_SESSION`
- `CLOSED`

Neste pacote, criacao usa `RECRUITING`. Atualizacao aceita somente `DRAFT`, `RECRUITING` e `PREPARED`. Sessao em andamento e fechamento ficam fora do escopo.

## Convites

Estados de convite:

- `PENDING`
- `ACCEPTED`
- `REVOKED`
- `EXPIRED`

Somente `MASTER` ativo da mesa cria, lista e revoga convites. O aceite exige usuario autenticado, e-mail verificado, token valido, token nao expirado, convite pendente, e-mail do convite igual ao usuario autenticado e ausencia de membership ativa.

Em `production`, o token bruto nao e retornado. Em desenvolvimento/teste, ele volta na resposta para permitir validacao controlada enquanto nao ha adapter de entrega de e-mail para convites.

## Matriz de papeis

| Acao | PLAYER | MASTER | ADMIN global sem membership |
|---|---:|---:|---:|
| Ver mesa propria | Sim | Sim | Nao |
| Ver membros | Sim | Sim | Nao |
| Atualizar mesa no escopo PT02 | Nao | Sim | Nao |
| Criar/listar/revogar convites | Nao | Sim | Nao |
| Aceitar convite proprio | Sim | Sim, se convidado | Sim, se convidado como usuario |

`ADMIN` global nao concede autoridade de `TABLE_MASTER`.

## Matriz de Context

| Visibilidade | Anonimo | PLAYER/Master via `/context/player` | MASTER via `/context/master` |
|---|---:|---:|---:|
| `PUBLIC` | Sim nas rotas publicas existentes | Sim | Sim |
| `AUTHENTICATED_TABLE_PLAYER` | Nao | Sim | Sim |
| `TABLE_MASTER` | Nao | Nao | Sim |
| `SPECIFIC_CHARACTER` | Nao | Nao | Nao |
| `SPECTATOR` | Nao | Nao | Nao |
| `AUTHOR_ADMIN` | Nao | Nao | Nao |

Todas as leituras por mesa usam a `ContextVersion` fixada na `Table` e exigem membership ativa na mesma mesa.

## Endpoints

- `POST /api/v1/tables`
- `GET /api/v1/tables`
- `GET /api/v1/tables/:tableId`
- `PATCH /api/v1/tables/:tableId`
- `GET /api/v1/tables/:tableId/members`
- `POST /api/v1/tables/:tableId/invitations`
- `GET /api/v1/tables/:tableId/invitations`
- `POST /api/v1/tables/:tableId/invitations/:invitationId/revoke`
- `POST /api/v1/table-invitations/accept`
- `GET /api/v1/tables/:tableId/context/player`
- `GET /api/v1/tables/:tableId/context/master`

## Autorizacao

`TableAuthorizationService` centraliza:

- `requireTableMember`
- `requireTableMaster`
- `requireTablePlayerOrMaster`

As politicas consultam `TableMember` ativo por `tableId` e `userId`. Papel, usuario e mesa enviados pelo cliente nao sao confiados.

## Escopo implementado

- Criacao de mesa a partir de `Setting`, `Episode` e `ContextVersion` publicada.
- Criacao atomica da membership `MASTER`.
- Convites por e-mail com token hash.
- Aceite transacional e idempotente contra repeticao.
- Isolamento de Context por mesa e papel.
- Bloqueio de `SPECIFIC_CHARACTER`, `SPECTATOR` e `AUTHOR_ADMIN` por membership de mesa.

## Pendencias

- Entrega real de e-mail de convite.
- Remocao/substituicao de ultimo Mestre.
- Execucao de sessao, Character Builder e fluxos de Package 03.
- Migração assistida de mesas legadas que nao possuem `Setting/Episode/ContextVersion`.

## Migration e rollback

A migration `20260730100000_add_table_package_02` adiciona colunas obrigatorias em `Table`, `TableInvitation`, novos status e indices. Se houver mesas legadas sem contexto fixado, a migration falha explicitamente para evitar associacao inventada.

Rollback exige remover convites e desfazer FKs/colunas novas. Em ambientes com dados reais, primeiro exporte o mapeamento de mesas para `Setting/Episode/ContextVersion`.

## Como testar

```bash
npm run prisma:generate
npx tsc --noEmit
npm run test:context
npm run test:table-overview
npm run test:auth
npm test
npx tsc
```

Integração PostgreSQL real:

```bash
NODE_ENV=test TEST_DATABASE_CONFIRMED_DISPOSABLE=true TEST_DATABASE_URL="postgresql://..." TEST_DIRECT_URL="postgresql://..." npm run test:table-package02:integration
NODE_ENV=test TEST_DATABASE_CONFIRMED_DISPOSABLE=true TEST_DATABASE_URL="postgresql://..." TEST_DIRECT_URL="postgresql://..." npm run test:context:integration
```

Nunca execute essas integrações contra banco compartilhado, desenvolvimento, staging ou producao.
