# Story 1.4 — Consentimento e ingresso

## Contrato

`GET /api/v1/campaigns/public/{slug}/consent` retorna o documento vigente da campanha, incluindo a versao que deve ser devolvida pelo cliente.

`POST /api/v1/campaigns/public/{slug}/consent` exige `status` e `consentVersion`; `source` e opcional.

- `ACCEPTED` grava o aceite e cria/reutiliza a membership ativa na mesma transacao.
- `DECLINED` registra a recusa sem criar membership.
- `REVOKED` revoga aceites e remove a membership ativa na mesma transacao.
- Versao divergente retorna `409 CONSENT_VERSION_MISMATCH`.
- Repetir um aceite ja concluido nao duplica aceite nem membership e preserva `acceptedAt`.
- Falha de capacidade, elegibilidade ou persistencia reverte toda a operacao.

O endpoint legado `POST /public/{slug}/join` continua disponivel para clientes anteriores, com ingresso idempotente e exigencia do aceite vigente.

## Efeitos de revogacao ou nova versao

Jogadores de campanha publica precisam de membership ativa e aceite da versao atual em toda autorizacao de mesa. A revogacao remove a membership e o gatilho de banco revoga as sessoes relacionadas. Perfis e artes publicas deixam de ser servidos quando a participacao perde elegibilidade e usam `Cache-Control: no-store`.

## Operacao

A revisao juridica e de privacidade continua sendo gate para convite externo. A PR de rollout #22 configura a Vercel para aplicar migrations antes do build de producao e abortar a publicacao em caso de falha; previews nao aplicam DDL.

O runner `npm run test:campaign-participation:integration` exige `TEST_DATABASE_URL` de um PostgreSQL descartavel, `TEST_DATABASE_CONFIRMED_DISPOSABLE=true` e `RUN_CAMPAIGN_PARTICIPATION_DB_INTEGRATION=1`. Ele aplica as migrations nesse banco, valida aceite/ingresso concorrente, versao, revogacao e rollback atomico, e remove os registros criados.
