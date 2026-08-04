# Campanha publica do piloto

Este documento resume o contrato backend para campanha publica por slug, consentimento versionado e entrada segura na mesa.

## Rotas publicas

- `GET /api/v1/campaigns/public/:slug`
- `GET /api/v1/campaigns/public/consent`
- `GET /api/v1/campaigns/public/final-survey`

Campanha inexistente, nao ativa, encerrada ou com mesa indisponivel retorna erro generico para nao revelar dados internos.

## Rotas autenticadas do participante

- `POST /api/v1/campaigns/public/:slug/consent`
- `POST /api/v1/campaigns/public/:slug/join`
- `GET /api/v1/campaigns/public/:slug/resume`
- `GET /api/v1/campaigns/public/:slug/final-survey/me`
- `PUT /api/v1/campaigns/public/:slug/final-survey/me`
- `POST /api/v1/campaigns/public/:slug/events`

Entrada por slug exige consentimento `ACCEPTED` na versao atual da campanha. Recusa nao cria vinculo com a mesa.

A retomada por slug retorna o estado de consentimento, membership e o overview do jogador quando ele ja esta vinculado a mesa da campanha.

A pesquisa final do jogador usa a versao `pilot-v1`, permite uma resposta ativa por participante/campanha e atualiza a resposta enquanto a campanha esta `ACTIVE`. O endpoint de eventos aceita somente `eventKey` oficial do piloto e metadados tecnicos minimos; ficha, respostas narrativas, prompt integral e segredos ficam nas entidades proprias.

## Rotas administrativas

- `POST /api/v1/campaigns/admin`
- `PATCH /api/v1/campaigns/admin/:campaignId`
- `POST /api/v1/campaigns/admin/:campaignId/status`

Campanhas nascem em `DRAFT`. O slug so pode ser alterado enquanto a campanha esta em `DRAFT`. Campanhas `ACTIVE` e `CLOSED` mantem o slug reservado.

## Persistencia

- `PublicCampaign`
- `ParticipantConsent`
- `FinalSurveyResponse`
- `AnalyticsEvent`

O texto do consentimento nao e duplicado em cada aceite. O registro referencia `consentVersion`, atualmente `research-pilot-v1`.

## Fora do escopo

- frontend;
- modo espectador;
- sessao;
- combate;
- pesquisa do Mestre;
- relatorios complexos de BI.
