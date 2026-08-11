# Endpoints backend do MVP

Este documento lista os contratos principais do MVP do piloto `pilot-v1`.

Regras gerais:

- Base URL local: `http://localhost:5000`.
- Respostas seguem o envelope do backend: `success: true` em sucesso e `error.code` em erro.
- Autenticacao usa `Authorization: Bearer <token>`, exceto endpoints marcados como publicos.
- Campos publicos podem ser consumidos pelo frontend do jogador.
- Campos secretos nunca devem ser enviados ao jogador: `gm_secret`, `SECRET_CANON`, `TABLE_MASTER`, `AUTHOR_ADMIN`, prompts integrais, tokens, credenciais, ficha completa em analytics, respostas narrativas em analytics e qualquer conteudo de Mestre.

## Status e enums principais

### Campanha publica

- `PublicCampaignStatus`: `DRAFT`, `ACTIVE`, `CLOSED`.
- Slug: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, entre 3 e 80 caracteres.
- Campanha publica por slug so retorna campanhas `ACTIVE` com mesa disponivel.
- Campanhas inexistentes ou indisponiveis retornam erro generico para nao revelar estado interno.

### Consentimento

- `ParticipantConsentStatus`: `ACCEPTED`, `DECLINED`, `REVOKED`.
- Versao atual: `research-pilot-v1`.
- Usuario sem consentimento `ACCEPTED` nao entra na campanha.

### Personagem

- `sheetStatus`: `DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`, `APPROVED`.
- Personagem submetido nao deve ser alterado como rascunho.
- Submissao exige as quatro perguntas obrigatorias do Episodio 1.

### IA do jogador

- `useCase`: `PLAYER_CHARACTER_CREATION`, `PLAYER_CHARACTER_VALIDATION`.
- `PlayerAiSuggestionStatus`: `GENERATED`, `ACCEPTED`, `EDITED`, `DISCARDED`.
- A IA sugere; o jogador decide; o backend nao altera ficha automaticamente.

### Pesquisa final

- Versao atual: `pilot-v1`.
- `aiHelpfulnessScore`: inteiro `1..5` ou `NOT_USED`.
- `aiBoundaryProblem`: booleano.
- Uma resposta ativa por usuario/campanha; `PUT` atualiza enquanto a campanha estiver ativa.

### Analytics

Eventos oficiais:

- `campaign_landing_viewed`
- `registration_started`
- `registration_completed`
- `email_verified`
- `consent_recorded`
- `campaign_joined`
- `public_context_viewed`
- `character_builder_started`
- `builder_step_completed`
- `character_draft_saved`
- `character_submitted`
- `final_survey_submitted`
- `pilot_flow_completed`
- `ai_suggestion_generated`
- `ai_suggestion_failed`
- `ai_suggestion_decided`

Metadata publica permitida: ids tecnicos, fonte do fluxo, versao de metadata, contagens, duracao, status tecnico e decisao da sugestao.

Metadata proibida: senha, token, Authorization, prompt integral, ficha completa, respostas narrativas, segredo de Mestre, conteudo `gm_secret` ou marcadores equivalentes.

## Inventario geral de rotas disponiveis

Este inventario reflete as rotas montadas em `src/server.ts` e nos arquivos `*.routes.ts` / `*.routers.ts`.

Legenda:

- `Publico`: nao exige bearer JWT.
- `Auth`: exige bearer JWT.
- `Admin`: exige bearer JWT com `accountRole=ADMIN`.
- `Mesa`: exige membership ativa na mesa; a regra exata depende do endpoint.
- `Mestre`: exige papel `MASTER` na mesa.
- `Jogador`: exige papel `PLAYER` na mesa.
- `Body`: `sim` quando ha validacao ou payload esperado; `-` quando normalmente vazio.
- `Detalhe`: `MVP abaixo` significa que ha contrato detalhado neste documento; `OpenAPI` significa consultar tambem `/docs` ou `/docs.json`.

### Tecnicas

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | Publico | - | - | status `ok` | erro inesperado | publico: status tecnico; secreto: env/credenciais | MVP abaixo |
| GET | `/ready` | Publico | - | - | status `ready` | falha de banco | publico: prontidao; secreto: URL/credenciais do banco | MVP abaixo |
| GET | `/docs.json` | Publico | - | - | OpenAPI JSON | erro inesperado | publico: contratos; secreto: valores de env | MVP abaixo |
| GET | `/docs` | Publico | - | - | Swagger UI | erro inesperado | publico: contratos; secreto: valores de env | MVP abaixo |
| GET | `/api/v1/meta/version` | Publico | - | - | nome, versao, ambiente | erro inesperado | publico: metadados da API; secreto: env/credenciais | MVP abaixo |

### Auth e usuarios

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Publico | - | sim | usuario criado, entrega de e-mail | `400`, `409 EMAIL_ALREADY_EXISTS` | publico: usuario; secreto: senha/hash/token | MVP abaixo |
| POST | `/api/v1/auth/login` | Publico | - | sim | JWT e usuario | `401`, `403 EMAIL_NOT_VERIFIED` | publico: usuario/token ao dono; secreto: senha/hash/secret | MVP abaixo |
| POST | `/api/v1/auth/email-verification/confirm` | Publico | - | sim | `EMAIL_VERIFIED` | `400`, `409` | publico: status; secreto: token/hash | MVP abaixo |
| POST | `/api/v1/auth/email-verification/resend` | Publico | - | sim | mensagem generica | `400`, `429` | publico: mensagem; secreto: existencia da conta | MVP abaixo |
| GET | `/api/v1/auth/me` | Auth | - | - | usuario autenticado | `401` | publico ao dono; secreto: senha/hash | MVP abaixo |
| GET | `/api/v1/users/me/profile` | Auth | - | - | perfil do usuario | `401` | publico ao dono; secreto: senha/hash | OpenAPI |
| PATCH | `/api/v1/users/me/profile` | Auth | - | sim | perfil atualizado | `400`, `401`, `409` | publico ao dono; secreto: senha/hash | OpenAPI |
| POST | `/api/users/register` | Publico | alias legado | sim | usuario criado | `400`, `409` | igual a `/api/v1/auth/register` | legado |
| POST | `/api/users/login` | Publico | alias legado | sim | JWT e usuario | `401`, `403` | igual a `/api/v1/auth/login` | legado |
| GET | `/api/users/me` | Auth | alias legado | - | usuario autenticado | `401` | igual a `/api/v1/auth/me` | legado |

### Builder e contexto

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/builder/configs/active` | Publico | - | - | Builder ativo `pilot-v1` | `404`, `500 BUILDER_SECRET_CONTENT_DETECTED` | publico: catalogos; secreto: canon/GM | MVP abaixo |
| GET | `/api/v1/builder/configs/{version}` | Publico | `version` | - | Builder por versao | `404`, `500` | publico: catalogos; secreto: canon/GM | MVP abaixo |
| GET | `/api/v1/context/settings/{settingStableKey}/episodes/{episodeStableKey}/active-public` | Publico | `settingStableKey`, `episodeStableKey` | - | contexto publico ativo | `404` | publico: contexto publicado; secreto: unidades secretas | OpenAPI |
| GET | `/api/v1/context/versions/{id}/public` | Publico | `id` | - | versao publica | `404` | publico: unidades publicas; secreto: unidades secretas | OpenAPI |
| GET | `/api/v1/context/units/{id}/public` | Publico | `id` | - | unidade publica | `404` | publico: unidade publica; secreto: unidade restrita | OpenAPI |
| POST | `/api/v1/context/admin/settings` | Admin | - | sim | setting criado | `400`, `403` | admin: conteudo operacional; jogador: indisponivel | OpenAPI |
| POST | `/api/v1/context/admin/episodes` | Admin | - | sim | episodio criado | `400`, `403` | admin only | OpenAPI |
| POST | `/api/v1/context/admin/versions` | Admin | - | sim | versao criada | `400`, `403` | admin only | OpenAPI |
| POST | `/api/v1/context/admin/units` | Admin | - | sim | unidade criada | `400`, `403` | pode conter secreto; nao enviar ao jogador sem filtro publico | OpenAPI |
| POST | `/api/v1/context/admin/versions/{id}/publish` | Admin | `id` | - | versao publicada | `403`, `404`, `409` | admin only | OpenAPI |
| POST | `/api/v1/context/admin/versions/{id}/archive` | Admin | `id` | - | versao arquivada | `403`, `404`, `409` | admin only | OpenAPI |
| GET | `/api/v1/context/admin/versions` | Admin | filtros conforme OpenAPI | - | lista de versoes | `403` | admin only | OpenAPI |
| GET | `/api/v1/context/admin/versions/{id}` | Admin | `id` | - | versao autorizada | `403`, `404` | pode incluir conteudo restrito | OpenAPI |

### Campanhas, pesquisa e analytics

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/campaigns/public/consent` | Publico | - | - | documento de consentimento | erro inesperado | publico: texto/version; secreto: aceites | MVP abaixo |
| GET | `/api/v1/campaigns/public/final-survey` | Publico | - | - | configuracao da pesquisa | erro inesperado | publico: perguntas/version; secreto: respostas | MVP abaixo |
| GET | `/api/v1/campaigns/public/{slug}` | Publico | `slug` | - | landing publica | `404` generico | publico: landing; secreto: tableId/joinCode/indisponibilidade interna | MVP abaixo |
| GET | `/api/v1/campaigns/public/{slug}/resume` | Auth | `slug` | - | retomada do jogador | `401`, `404` | proprio progresso; secreto: outros jogadores/GM | MVP abaixo |
| POST | `/api/v1/campaigns/public/{slug}/consent` | Auth | `slug` | sim | consentimento registrado | `400`, `401`, `404` | proprio consentimento; secreto: outros usuarios | MVP abaixo |
| POST | `/api/v1/campaigns/public/{slug}/join` | Auth | `slug` | - | membership `PLAYER` | `401`, `404`, `409` | proprio vinculo; secreto: joinCode/outros membros | MVP abaixo |
| GET | `/api/v1/campaigns/public/{slug}/final-survey/me` | Auth/Jogador | `slug` | - | minha resposta ou null | `401`, `403`, `404` | propria resposta; secreto: respostas alheias | MVP abaixo |
| PUT | `/api/v1/campaigns/public/{slug}/final-survey/me` | Auth/Jogador | `slug` | sim | pesquisa salva | `400`, `401`, `403`, `404` | propria resposta; secreto: respostas alheias | MVP abaixo |
| POST | `/api/v1/campaigns/public/{slug}/events` | Auth | `slug` | sim | evento registrado | `400`, `403`, `404` | evento tecnico; secreto: prompt/ficha/respostas/segredos | MVP abaixo |
| POST | `/api/v1/campaigns/admin` | Admin | - | sim | campanha `DRAFT` criada | `400`, `403`, `404`, `409` | admin; secreto para jogador ate `ACTIVE` | MVP abaixo |
| GET | `/api/v1/campaigns/admin/{campaignId}/operations` | Admin | `campaignId` | - | painel operacional | `403`, `404` | agregados admin; secreto: respostas narrativas/prompts/ficha completa | MVP abaixo |
| PATCH | `/api/v1/campaigns/admin/{campaignId}` | Admin | `campaignId` | sim | campanha atualizada | `400`, `403`, `404`, `409` | admin only | MVP abaixo |
| POST | `/api/v1/campaigns/admin/{campaignId}/status` | Admin | `campaignId` | sim | status atualizado | `400`, `403`, `404`, `409` | admin only | MVP abaixo |

### Mesas, IA de mesa e personagens de mesa

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/tables` | Auth | - | sim | mesa criada | `400`, `401` | criador/membros; secreto: joinCode fora de fluxo autorizado | OpenAPI |
| GET | `/api/v1/tables` | Auth | - | - | mesas do usuario | `401` | somente mesas autorizadas | OpenAPI |
| GET | `/api/v1/tables/dashboard` | Auth | - | - | dashboard do usuario | `401` | dados do usuario; nao global | OpenAPI |
| POST | `/api/v1/tables/join` | Auth | - | sim | entrou por codigo | `400`, `401`, `404`, `409` | proprio vinculo; secreto: outros membros | OpenAPI |
| PATCH | `/api/v1/tables/{tableId}` | Auth/Mesa | `tableId` | sim | mesa atualizada | `400`, `403`, `404` | conforme papel; secreto: dados de mesa nao autorizada | OpenAPI |
| GET | `/api/v1/tables/{id}` | Auth/Mesa | `id` | - | detalhe da mesa | `403`, `404` | membros autorizados | OpenAPI |
| GET | `/api/v1/tables/{tableId}/members` | Auth/Mesa | `tableId` | - | membros | `403`, `404` | membros da mesa; nao publico | OpenAPI |
| POST | `/api/v1/tables/{tableId}/invitations` | Auth/Mestre | `tableId` | sim | convite criado | `400`, `403`, `404` | convite autorizado; secreto: token/hash | OpenAPI |
| GET | `/api/v1/tables/{tableId}/invitations` | Auth/Mestre | `tableId` | - | convites | `403`, `404` | mestre; secreto para jogador | OpenAPI |
| POST | `/api/v1/tables/{tableId}/invitations/{invitationId}/revoke` | Auth/Mestre | `tableId`, `invitationId` | - | convite revogado | `403`, `404`, `409` | mestre only | OpenAPI |
| POST | `/api/v1/table-invitations/accept` | Auth | - | sim | convite aceito | `400`, `401`, `404`, `409` | proprio vinculo; secreto: token/hash | OpenAPI |
| GET | `/api/v1/tables/{tableId}/context/player` | Auth/Jogador | `tableId` | - | contexto seguro do jogador | `403`, `404` | publico ao jogador; secreto: GM/canon secreto | OpenAPI |
| GET | `/api/v1/tables/{tableId}/context/master` | Auth/Mestre | `tableId` | - | contexto do mestre | `403`, `404` | mestre; secreto para jogador | OpenAPI |
| GET | `/api/v1/tables/{tableId}/master/overview` | Auth/Mestre | `tableId` | - | overview do mestre | `403`, `404` | mestre; pode conter dados operacionais | OpenAPI |
| GET | `/api/v1/tables/{tableId}/player/overview` | Auth/Jogador | `tableId` | - | overview do jogador | `403`, `404` | proprio jogador; sem segredo | OpenAPI |
| POST | `/api/v1/tables/{tableId}/ai/world-summary` | Auth/Mestre | `tableId` | sim | sugestao IA | `400`, `403`, `429`, `503` | mestre; nao salva automaticamente | OpenAPI |
| POST | `/api/v1/tables/{tableId}/ai/mission-ideas` | Auth/Mestre | `tableId` | sim | sugestoes IA | `400`, `403`, `429`, `503` | mestre; nao salva automaticamente | OpenAPI |
| POST | `/api/v1/tables/{tableId}/ai/traits` | Auth/Mestre | `tableId` | sim | sugestoes de traits | `400`, `403`, `404`, `429`, `503` | mestre; nao salva automaticamente | OpenAPI |
| POST | `/api/v1/tables/{tableId}/ai/timeline-summary` | Auth/Mestre | `tableId` | sim | resumo sugerido | `400`, `403`, `429`, `503` | mestre; nao salva automaticamente | OpenAPI |
| POST | `/api/v1/tables/{tableId}/player-ai/character-help` | Auth/Jogador | `tableId` | sim | sugestoes assistivas | `400`, `403`, `404`, `429`, `503` | proprio jogador; sem segredo; nao altera ficha | MVP abaixo |
| PATCH | `/api/v1/tables/{tableId}/player-ai/suggestions/{suggestionId}/decision` | Auth/Jogador | `tableId`, `suggestionId` | sim | decisao registrada | `400`, `403`, `404`, `409` | proprio jogador; nao altera ficha | MVP abaixo |
| POST | `/api/v1/tables/{tableId}/characters` | Auth/Jogador | `tableId` | sim | rascunho criado | `400`, `403`, `409` | proprio rascunho | MVP abaixo |
| GET | `/api/v1/tables/{tableId}/characters/me` | Auth/Jogador | `tableId` | - | meu personagem/null | `403`, `404` | proprio personagem | MVP abaixo |
| GET | `/api/v1/tables/{tableId}/characters` | Auth/Mesa | `tableId`, query de lista | - | personagens paginados | `400`, `403` | autorizado por papel; cuidado com dados alheios | OpenAPI |
| GET | `/api/v1/tables/{tableId}/characters/{characterId}` | Auth/Mesa | `tableId`, `characterId` | - | personagem | `403`, `404` | dono/mestre; nao publico | MVP abaixo |
| PATCH | `/api/v1/tables/{tableId}/characters/{characterId}` | Auth/Jogador | `tableId`, `characterId` | sim | rascunho atualizado | `400`, `403`, `404`, `409` | proprio rascunho | MVP abaixo |
| PATCH | `/api/v1/tables/{tableId}/characters/{characterId}/episode-answers` | Auth/Jogador | `tableId`, `characterId` | sim | respostas salvas | `400`, `403`, `409` | proprio jogador; mestre apos envio | MVP abaixo |
| POST | `/api/v1/tables/{tableId}/characters/{characterId}/submit` | Auth/Jogador | `tableId`, `characterId` | - | submetido | `400`, `403`, `404`, `409` | proprio status; fila completa e secreta | MVP abaixo |
| GET | `/api/v1/tables/{tableId}/character-reviews` | Auth/Mestre | `tableId`, query | - | fila de revisao | `403`, `404` | mestre only | OpenAPI |
| GET | `/api/v1/tables/{tableId}/characters/{characterId}/reviews` | Auth/Mesa | `tableId`, `characterId` | - | eventos de revisao | `403`, `404` | dono/mestre | OpenAPI |
| POST | `/api/v1/tables/{tableId}/characters/{characterId}/request-changes` | Auth/Mestre | `tableId`, `characterId` | sim | ajuste solicitado | `400`, `403`, `404`, `409` | mestre/dono; feedback controlado | OpenAPI |
| POST | `/api/v1/tables/{tableId}/characters/{characterId}/approve` | Auth/Mestre | `tableId`, `characterId` | sim | personagem aprovado | `400`, `403`, `404`, `409` | mestre/dono | OpenAPI |
| PATCH | `/api/v1/tables/{tableId}/characters/{characterId}/review` | Auth/Mestre | `tableId`, `characterId` | sim | revisao registrada | `400`, `403`, `404` | mestre/dono | OpenAPI |
| GET | `/api/v1/tables/{tableId}/characters/{characterId}/traits` | Auth/Mesa | `tableId`, `characterId`, query | - | traits | `400`, `403`, `404` | autorizado; nao publico global | OpenAPI |
| POST | `/api/v1/tables/{tableId}/characters/{characterId}/traits` | Auth/Mestre | `tableId`, `characterId` | sim | trait criada | `400`, `403`, `404` | mestre/dono conforme retorno | OpenAPI |
| DELETE | `/api/v1/tables/{tableId}/characters/{characterId}/traits/{traitId}` | Auth/Mestre | ids | - | trait removida | `403`, `404` | mestre only | OpenAPI |
| GET | `/api/v1/tables/{tableId}/characters/{characterId}/trait-suggestions` | Auth/Mesa | ids | - | sugestoes | `403`, `404` | mestre/dono conforme regra | OpenAPI |
| POST | `/api/v1/tables/{tableId}/characters/{characterId}/trait-suggestions` | Auth/Mestre | ids | sim | sugestao criada | `400`, `403`, `404` | mestre; jogador ve se autorizado | OpenAPI |
| PATCH | `/api/v1/tables/{tableId}/characters/{characterId}/trait-suggestions/{suggestionId}/apply` | Auth/Mesa | ids | - | sugestao aplicada | `403`, `404`, `409` | fluxo separado da IA do jogador | OpenAPI |
| PATCH | `/api/v1/tables/{tableId}/characters/{characterId}/trait-suggestions/{suggestionId}/dismiss` | Auth/Mesa | ids | - | sugestao dispensada | `403`, `404`, `409` | fluxo separado da IA do jogador | OpenAPI |
| GET | `/api/v1/tables/{tableId}/world` | Auth/Mesa | `tableId` | - | mundo da mesa | `403`, `404` | membros; cuidado com campos de mestre | OpenAPI |
| PUT | `/api/v1/tables/{tableId}/world` | Auth/Mestre | `tableId` | sim | mundo salvo | `400`, `403` | mestre; jogador so via contexto seguro | OpenAPI |

### Missoes de mesa, submissions e timeline

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/tables/{tableId}/missions` | Auth/Mestre | `tableId` | sim | missao criada | `400`, `403` | mestre; jogador ve missao ativa permitida | OpenAPI |
| GET | `/api/v1/tables/{tableId}/missions` | Auth/Mesa | `tableId`, query | - | missoes paginadas | `400`, `403` | membros autorizados | OpenAPI |
| GET | `/api/v1/tables/{tableId}/missions/{missionId}` | Auth/Mesa | ids | - | missao | `403`, `404` | membros autorizados | OpenAPI |
| PATCH | `/api/v1/tables/{tableId}/missions/{missionId}` | Auth/Mestre | ids | sim | missao atualizada | `400`, `403`, `404` | mestre | OpenAPI |
| POST | `/api/v1/tables/{tableId}/missions/{missionId}/submissions` | Auth/Jogador | ids | sim | submissao criada | `400`, `403`, `404`, `409` | jogador/mestre; conteudo do jogador | OpenAPI |
| GET | `/api/v1/tables/{tableId}/missions/{missionId}/submissions` | Auth/Mestre | ids | - | submissions da missao | `403`, `404` | mestre only | OpenAPI |
| GET | `/api/v1/tables/{tableId}/submissions/me` | Auth/Jogador | `tableId`, query | - | minhas submissions | `400`, `403` | proprio jogador | OpenAPI |
| GET | `/api/v1/tables/{tableId}/submissions` | Auth/Mestre | `tableId`, query | - | submissions da mesa | `400`, `403` | mestre only | OpenAPI |
| PATCH | `/api/v1/tables/{tableId}/missions/{missionId}/submissions/{submissionId}/review` | Auth/Mestre | ids | sim | review de submissao | `400`, `403`, `404` | mestre/dono conforme retorno | OpenAPI |
| GET | `/api/v1/tables/{tableId}/timeline` | Auth/Mesa | `tableId`, query | - | timeline paginada | `400`, `403` | membros autorizados; cuidado com segredo | OpenAPI |
| POST | `/api/v1/tables/{tableId}/timeline` | Auth/Mestre | `tableId` | sim | evento criado | `400`, `403` | mestre; visibilidade depende do uso | OpenAPI |

### Personagens legados, inventario, recompensas, transacoes, loja, trocas e PvP

Estas rotas continuam disponiveis no backend, mas combate, rolagens, jogo fisico e sessao nao pertencem ao MVP do piloto atual.

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/characters/classes` | Auth | - | - | classes | `401` | catalogo autenticado | OpenAPI |
| GET | `/api/v1/characters` | Auth | query conforme OpenAPI | - | personagens do usuario | `401` | proprio usuario | OpenAPI |
| POST | `/api/v1/characters` | Auth | - | sim | personagem legado criado | `400`, `401` | proprio usuario | OpenAPI |
| POST | `/api/v1/characters/create` | Auth | alias | sim | personagem legado criado | `400`, `401` | proprio usuario | legado |
| GET | `/api/v1/characters/rankings` | Auth | `limit` | - | ranking | `400`, `401` | perfil publico/ranking | OpenAPI |
| GET | `/api/v1/characters/{id}/public-profile` | Auth | `id` | - | perfil publico | `401`, `404` | perfil publico permitido | OpenAPI |
| GET | `/api/v1/characters/{id}` | Auth | `id` | - | personagem | `401`, `403`, `404` | dono/autorizado | OpenAPI |
| GET | `/api/v1/characters/{id}/summary` | Auth | `id` | - | resumo | `401`, `403`, `404` | dono/autorizado | OpenAPI |
| PUT | `/api/v1/characters/{id}` | Auth | `id` | sim | perfil atualizado | `400`, `401`, `403`, `404` | dono | OpenAPI |
| PATCH | `/api/v1/characters/{id}/progress` | Auth | `id` | sim | progresso atualizado | `400`, `401`, `403` | dono/sistema | OpenAPI |
| PATCH | `/api/v1/characters/{id}/position` | Auth | `id` | sim | posicao atualizada | `400`, `401`, `403` | dono/sistema | OpenAPI |
| PATCH | `/api/v1/characters/{id}/customization` | Auth | `id` | sim | customizacao atualizada | `400`, `401`, `403` | dono | OpenAPI |
| POST | `/api/v1/characters/{id}/awaken` | Auth | `id` | sim | despertar executado | `400`, `401`, `403` | dono | OpenAPI |
| DELETE | `/api/v1/characters/{id}` | Auth | `id` | - | personagem removido | `401`, `403`, `404` | dono | OpenAPI |
| GET | `/api/characters/...` | Auth | alias legado | varia | varia | varia | igual a `/api/v1/characters/...` | legado |
| GET | `/api/v1/inventory/characters/{characterId}` | Auth | `characterId` | - | inventario | `401`, `403`, `404` | dono/autorizado | OpenAPI |
| GET | `/api/v1/inventory/characters/{characterId}/wallet` | Auth | `characterId` | - | carteira | `401`, `403`, `404` | dono/autorizado | OpenAPI |
| POST | `/api/v1/inventory/characters/{characterId}/items/{itemId}/use` | Auth | ids | sim | item usado | `400`, `403`, `404`, `409` | dono; efeitos legados | OpenAPI |
| POST | `/api/v1/inventory/characters/{characterId}/equipments/{equipmentId}/equip` | Auth | ids | - | equipamento equipado | `403`, `404`, `409` | dono; fora do Builder MVP | OpenAPI |
| POST | `/api/v1/inventory/characters/{characterId}/equipments/{equipmentId}/unequip` | Auth | ids | - | equipamento removido | `403`, `404`, `409` | dono | OpenAPI |
| POST | `/api/v1/rewards/claim` | Auth | - | sim | recompensa reivindicada | `400`, `403`, `404`, `409` | dono | OpenAPI |
| GET | `/api/v1/rewards/characters/{characterId}` | Auth | `characterId` | - | recompensas | `403`, `404` | dono/autorizado | OpenAPI |
| GET | `/api/v1/transactions/characters/{characterId}` | Auth | `characterId` | - | transacoes | `403`, `404` | dono/autorizado | OpenAPI |
| GET | `/api/v1/shop/catalog` | Publico | - | - | catalogo loja | erro inesperado | publico: produtos ativos | OpenAPI |
| GET | `/api/v1/shop/market/characters/{characterId}` | Auth | `characterId` | - | mercado do personagem | `403`, `404` | dono/autorizado | OpenAPI |
| POST | `/api/v1/shop/market/purchases` | Auth | - | sim | compra mercado | `400`, `403`, `404`, `409` | dono | OpenAPI |
| POST | `/api/v1/shop/market/sales` | Auth | - | sim | venda mercado | `400`, `403`, `404`, `409` | dono | OpenAPI |
| POST | `/api/v1/shop/purchases` | Auth | - | sim | compra | `400`, `403`, `404`, `409` | dono | OpenAPI |
| GET | `/api/v1/shop/payment-orders` | Auth | query conforme OpenAPI | - | pedidos de pagamento | `401` | proprio usuario/admin conforme regra | OpenAPI |
| POST | `/api/v1/shop/payment-orders` | Auth | - | sim | pedido criado | `400`, `401` | proprio usuario; secreto: provider internals | OpenAPI |
| POST | `/api/v1/shop/webhooks/payments` | Publico/webhook | - | sim | webhook processado | `400`, `401/403 se validado`, `409` | secreto: assinatura/provider payload sensivel | OpenAPI |
| GET | `/api/v1/trades/characters/{characterId}` | Auth | `characterId` | - | trocas | `403`, `404` | dono/autorizado | OpenAPI |
| POST | `/api/v1/trades/requests` | Auth | - | sim | troca solicitada | `400`, `403`, `404`, `409` | participantes da troca | OpenAPI |
| POST | `/api/v1/trades/{tradeId}/respond` | Auth | `tradeId` | sim | resposta registrada | `400`, `403`, `404`, `409` | participantes da troca | OpenAPI |
| GET | `/api/v1/pvp/rankings` | Auth | query conforme OpenAPI | - | ranking PvP | `401` | ranking publico/autenticado | OpenAPI |
| GET | `/api/v1/pvp/characters/{characterId}/overview` | Auth | `characterId` | - | overview PvP | `403`, `404` | dono/autorizado | OpenAPI |
| POST | `/api/v1/pvp/matches` | Auth | - | sim | partida criada | `400`, `403`, `404`, `409` | participantes | OpenAPI |

### Gameplay legado

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/gameplay/journey` | Publico | - | - | opcoes de jornada | erro inesperado | publico: catalogo gameplay | OpenAPI |
| GET | `/api/v1/gameplay/monsters` | Publico | query conforme OpenAPI | - | monstros | erro inesperado | publico: catalogo legado | OpenAPI |
| GET | `/api/v1/gameplay/bounties` | Publico | query conforme OpenAPI | - | bounties | erro inesperado | publico: catalogo legado | OpenAPI |
| GET | `/api/v1/gameplay/missions` | Publico | query conforme OpenAPI | - | missoes legadas | erro inesperado | publico: catalogo legado | OpenAPI |
| GET | `/api/v1/gameplay/trainings` | Publico | query conforme OpenAPI | - | treinamentos legados | erro inesperado | publico: catalogo legado | OpenAPI |
| GET | `/api/v1/gameplay/npcs` | Publico | query conforme OpenAPI | - | NPCs | erro inesperado | publico: catalogo legado | OpenAPI |
| GET | `/api/v1/gameplay/characters/{characterId}/missions/sessions` | Auth | `characterId` | - | sessoes de missao | `403`, `404` | dono/autorizado; fora do MVP | OpenAPI |
| GET | `/api/v1/gameplay/characters/{characterId}/missions/sessions/{sessionId}` | Auth | ids | - | sessao de missao | `403`, `404` | dono/autorizado; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/missions/start` | Auth | `characterId` | sim | jornada iniciada | `400`, `403`, `404`, `409` | dono; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/missions/sessions/{sessionId}/progress` | Auth | ids | sim | jornada progredida | `400`, `403`, `404`, `409` | dono; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/missions/sessions/{sessionId}/abandon` | Auth | ids | - | jornada abandonada | `403`, `404`, `409` | dono; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/actions/bounty-hunt` | Auth | `characterId` | sim | acao executada | `400`, `403`, `404`, `409` | dono; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/actions/missions` | Auth | `characterId` | sim | acao executada | `400`, `403`, `404`, `409` | dono; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/actions/training` | Auth | `characterId` | sim | treino executado | `400`, `403`, `404`, `409` | dono; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/actions/npc-interaction` | Auth | `characterId` | sim | interacao executada | `400`, `403`, `404`, `409` | dono; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/actions/market` | Auth | `characterId` | sim | acao de mercado | `400`, `403`, `404`, `409` | dono; fora do MVP | OpenAPI |
| POST | `/api/v1/gameplay/characters/{characterId}/combat-sessions/{combatSessionId}/actions` | Auth | ids | sim | turno de combate | `400`, `403`, `404`, `409` | dono; fora do MVP | OpenAPI |

### Admin legado de conteudo

Todas as rotas abaixo exigem `Admin`. Elas podem manipular catalogos legados usados por gameplay, loja e admin interno. Nao sao parte do fluxo MVP do piloto, mas continuam disponiveis.

| Metodo | Path | Auth | Params/query | Body | Sucesso | Erros relevantes | Publico vs secreto | Detalhe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/monsters` | Admin | query conforme OpenAPI | - | lista | `403` | admin/catalogo | OpenAPI |
| POST | `/api/v1/admin/monsters` | Admin | - | sim | criado | `400`, `403` | admin only | OpenAPI |
| PATCH | `/api/v1/admin/monsters/{id}` | Admin | `id` | sim | atualizado | `400`, `403`, `404` | admin only | OpenAPI |
| DELETE | `/api/v1/admin/monsters/{id}` | Admin | `id` | - | removido | `403`, `404` | admin only | OpenAPI |
| GET | `/api/v1/admin/bounties` | Admin | query | - | lista | `403` | admin/catalogo | OpenAPI |
| POST | `/api/v1/admin/bounties` | Admin | - | sim | criado | `400`, `403` | admin only | OpenAPI |
| PATCH | `/api/v1/admin/bounties/{id}` | Admin | `id` | sim | atualizado | `400`, `403`, `404` | admin only | OpenAPI |
| DELETE | `/api/v1/admin/bounties/{id}` | Admin | `id` | - | removido | `403`, `404` | admin only | OpenAPI |
| GET | `/api/v1/admin/missions` | Admin | query | - | lista | `403` | admin/catalogo | OpenAPI |
| POST | `/api/v1/admin/missions` | Admin | - | sim | criado | `400`, `403` | admin only | OpenAPI |
| PATCH | `/api/v1/admin/missions/{id}` | Admin | `id` | sim | atualizado | `400`, `403`, `404` | admin only | OpenAPI |
| DELETE | `/api/v1/admin/missions/{id}` | Admin | `id` | - | removido | `403`, `404` | admin only | OpenAPI |
| GET | `/api/v1/admin/trainings` | Admin | query | - | lista | `403` | admin/catalogo | OpenAPI |
| POST | `/api/v1/admin/trainings` | Admin | - | sim | criado | `400`, `403` | admin only | OpenAPI |
| PATCH | `/api/v1/admin/trainings/{id}` | Admin | `id` | sim | atualizado | `400`, `403`, `404` | admin only | OpenAPI |
| DELETE | `/api/v1/admin/trainings/{id}` | Admin | `id` | - | removido | `403`, `404` | admin only | OpenAPI |
| GET | `/api/v1/admin/npcs` | Admin | query | - | lista | `403` | admin/catalogo | OpenAPI |
| POST | `/api/v1/admin/npcs` | Admin | - | sim | criado | `400`, `403` | admin only | OpenAPI |
| PATCH | `/api/v1/admin/npcs/{id}` | Admin | `id` | sim | atualizado | `400`, `403`, `404` | admin only | OpenAPI |
| DELETE | `/api/v1/admin/npcs/{id}` | Admin | `id` | - | removido | `403`, `404` | admin only | OpenAPI |
| GET | `/api/v1/admin/shop-products` | Admin | query | - | lista | `403` | admin/catalogo | OpenAPI |
| POST | `/api/v1/admin/shop-products` | Admin | - | sim | criado | `400`, `403` | admin only | OpenAPI |
| PATCH | `/api/v1/admin/shop-products/{id}` | Admin | `id` | sim | atualizado | `400`, `403`, `404` | admin only | OpenAPI |
| DELETE | `/api/v1/admin/shop-products/{id}` | Admin | `id` | - | removido | `403`, `404` | admin only | OpenAPI |

## Autenticacao

### POST `/api/v1/auth/register`

Autenticacao: publico.

Params/query: nenhum.

Body:

```json
{
  "nome": "Jogador Piloto",
  "email": "jogador@example.com",
  "senha": "senha-forte"
}
```

Resposta `201`:

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "nome": "Jogador Piloto",
    "email": "jogador@example.com",
    "accountRole": "USER",
    "emailVerifiedAt": null,
    "theme": null
  },
  "emailVerificationRequired": true,
  "emailDelivery": "SENT"
}
```

Erros relevantes: `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_EXISTS`.

Publico: id, nome, email, accountRole, emailVerifiedAt, theme.

Secreto: senha, hash de senha, token de confirmacao.

### POST `/api/v1/auth/login`

Autenticacao: publico.

Body:

```json
{
  "email": "jogador@example.com",
  "senha": "senha-forte"
}
```

Resposta `200`:

```json
{
  "success": true,
  "token": "jwt",
  "user": {
    "id": "user-id",
    "nome": "Jogador Piloto",
    "email": "jogador@example.com",
    "accountRole": "USER",
    "emailVerifiedAt": "2026-08-04T12:00:00.000Z",
    "theme": null
  }
}
```

Erros relevantes: `401 INVALID_CREDENTIALS`, `403 EMAIL_NOT_VERIFIED`.

Publico: dados do usuario autenticado.

Secreto: senha, hash, `JWT_SECRET`. O token deve ficar protegido no cliente.

### POST `/api/v1/auth/email-verification/confirm`

Autenticacao: publico.

Body:

```json
{
  "token": "token-de-confirmacao"
}
```

Resposta `200`:

```json
{
  "success": true,
  "code": "EMAIL_VERIFIED"
}
```

Erros relevantes: `400 EMAIL_VERIFICATION_TOKEN_INVALID`, `400 EMAIL_VERIFICATION_TOKEN_EXPIRED`, `409 EMAIL_ALREADY_VERIFIED`.

Publico: status de confirmacao.

Secreto: token em logs, token hash.

### POST `/api/v1/auth/email-verification/resend`

Autenticacao: publico.

Body:

```json
{
  "email": "jogador@example.com"
}
```

Resposta `200`:

```json
{
  "success": true,
  "message": "Se houver uma conta pendente para este e-mail, enviaremos uma nova confirmacao."
}
```

Erros relevantes: `400 VALIDATION_ERROR`, `429 EMAIL_VERIFICATION_RESEND_COOLDOWN`.

Publico: mensagem generica.

Secreto: existencia real da conta quando o endpoint retorna mensagem generica.

### GET `/api/v1/auth/me`

Autenticacao: bearer JWT.

Resposta `200`:

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "nome": "Jogador Piloto",
    "email": "jogador@example.com",
    "accountRole": "USER",
    "emailVerifiedAt": "2026-08-04T12:00:00.000Z",
    "theme": null
  }
}
```

Erros relevantes: `401 AUTH_REQUIRED`, `401 INVALID_TOKEN`.

Publico: dados do proprio usuario.

Secreto: senha, hash, tokens.

## Builder

### GET `/api/v1/builder/configs/active`

Autenticacao: publico.

Resposta `200`:

```json
{
  "success": true,
  "config": {
    "version": "pilot-v1",
    "status": "ACTIVE",
    "archetypes": [{ "key": "guardian_blade", "name": "Guardiao da Lamina" }],
    "attributes": {
      "totalPoints": 12,
      "min": 0,
      "maxInitialWithoutApproval": 4,
      "keys": ["strength", "agility", "vigor", "intellect", "presence", "spirit"]
    },
    "trainings": { "requiredCount": 3, "bonus": 2 },
    "episodeOneQuestions": [
      {
        "questionKey": "relationship_with_erya",
        "prompt": "Qual e sua relacao com Erya?",
        "version": "pilot-v1"
      }
    ]
  }
}
```

Erros relevantes: `404 BUILDER_CONFIG_NOT_FOUND`, `500 BUILDER_SECRET_CONTENT_DETECTED`.

Publico: catalogos oficiais, regras do Builder, perguntas publicas.

Secreto: conteudo de Mestre, `gm_secret`, canon secreto, notas internas.

### GET `/api/v1/builder/configs/{version}`

Autenticacao: publico.

Path params:

- `version`: `pilot-v1`.

Resposta `200`: mesmo formato de `GET /active`.

Erros relevantes: `404 BUILDER_CONFIG_NOT_FOUND`, `500 BUILDER_SECRET_CONTENT_DETECTED`.

## Campanha publica

### GET `/api/v1/campaigns/public/consent`

Autenticacao: publico.

Resposta `200`:

```json
{
  "success": true,
  "consentDocument": {
    "version": "research-pilot-v1",
    "text": "Concordo em participar do piloto...",
    "requiresLegalReviewBeforeExternalPilot": true
  }
}
```

Erros relevantes: nenhum especifico alem de erro inesperado.

Publico: texto operacional do consentimento e versao.

Secreto: dados de aceite de usuarios.

### GET `/api/v1/campaigns/public/{slug}`

Autenticacao: publico.

Path params:

- `slug`: slug publico.

Resposta `200`:

```json
{
  "success": true,
  "campaign": {
    "id": "campaign-id",
    "slug": "piloto-bravantus",
    "title": "Piloto Bravantus",
    "description": "Descricao publica",
    "status": "ACTIVE",
    "builderConfigVersion": "pilot-v1",
    "consentVersion": "research-pilot-v1",
    "table": {
      "name": "Mesa Piloto",
      "status": "RECRUITING",
      "seats": { "maxPlayers": 8, "activeMembers": 2 }
    },
    "world": {
      "title": "Guardian of Bravantus",
      "summary": "Resumo publico",
      "tone": "Aventura"
    }
  }
}
```

Erros relevantes: `404 PUBLIC_CAMPAIGN_NOT_FOUND`.

Publico: slug, titulo, descricao, versoes, disponibilidade, contexto publico.

Secreto: `tableId`, join code, membros, emails, contexto secreto, motivos internos de indisponibilidade.

### POST `/api/v1/campaigns/public/{slug}/consent`

Autenticacao: bearer JWT.

Path params:

- `slug`.

Body:

```json
{
  "status": "ACCEPTED",
  "source": "campaign_public_flow"
}
```

Resposta `200`:

```json
{
  "success": true,
  "consent": {
    "id": "consent-id",
    "userId": "user-id",
    "campaignId": "campaign-id",
    "consentVersion": "research-pilot-v1",
    "status": "ACCEPTED",
    "source": "campaign_public_flow",
    "acceptedAt": "2026-08-04T12:00:00.000Z",
    "revokedAt": null
  },
  "campaign": {}
}
```

Erros relevantes: `400 INVALID_CONSENT_STATUS`, `401 AUTH_REQUIRED`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`.

Publico ao proprio usuario: seu status de consentimento.

Secreto: consentimentos de outros usuarios.

### POST `/api/v1/campaigns/public/{slug}/join`

Autenticacao: bearer JWT.

Path params:

- `slug`.

Body: vazio.

Resposta `200`:

```json
{
  "success": true,
  "campaign": {},
  "membership": {
    "id": "membership-id",
    "tableId": "table-id",
    "userId": "user-id",
    "role": "PLAYER",
    "status": "ACTIVE"
  }
}
```

Erros relevantes: `401 AUTH_REQUIRED`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`, `409 CAMPAIGN_CONSENT_REQUIRED`, `409 PUBLIC_CAMPAIGN_FULL`, `409 TABLE_MEMBERSHIP_NOT_ELIGIBLE`.

Publico ao proprio usuario: membership criada e `tableId` necessario para proximos endpoints autenticados.

Secreto: join code da mesa, dados de outros membros, razoes internas de campanha indisponivel.

### GET `/api/v1/campaigns/public/{slug}/resume`

Autenticacao: bearer JWT.

Path params:

- `slug`.

Resposta `200`:

```json
{
  "success": true,
  "resume": {
    "campaign": {},
    "consent": {},
    "membership": {},
    "playerOverview": {},
    "nextRecommendedAction": null
  }
}
```

Possiveis `nextRecommendedAction.key`: `ACCEPT_CONSENT`, `JOIN_CAMPAIGN`, alem das acoes de mesa retornadas por `playerOverview`.

Erros relevantes: `401 AUTH_REQUIRED`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`.

Publico ao proprio usuario: seu progresso, sua ficha resumida, proximas acoes.

Secreto: dados de outros jogadores, conteudo de Mestre, contexto secreto.

## Campanha admin

### POST `/api/v1/campaigns/admin`

Autenticacao: bearer JWT com `ADMIN`.

Body:

```json
{
  "tableId": "table-id",
  "title": "Piloto Bravantus",
  "description": "Descricao publica",
  "slug": "piloto-bravantus"
}
```

Resposta `201`:

```json
{
  "success": true,
  "campaign": {
    "id": "campaign-id",
    "tableId": "table-id",
    "slug": "piloto-bravantus",
    "status": "DRAFT",
    "builderConfigVersion": "pilot-v1",
    "consentVersion": "research-pilot-v1"
  }
}
```

Erros relevantes: `400 INVALID_CAMPAIGN_SLUG`, `403 FORBIDDEN`, `404 TABLE_NOT_FOUND`, `409 PUBLIC_CAMPAIGN_SLUG_CONFLICT`.

Publico admin: dados de gestao.

Secreto para jogador: `tableId`, ids administrativos, status `DRAFT`.

### PATCH `/api/v1/campaigns/admin/{campaignId}`

Autenticacao: bearer JWT com `ADMIN`.

Path params:

- `campaignId`.

Body:

```json
{
  "title": "Piloto Bravantus Atualizado",
  "description": "Nova descricao publica",
  "slug": "piloto-bravantus-v1"
}
```

Resposta `200`: campanha atualizada.

Erros relevantes: `400 INVALID_CAMPAIGN_SLUG`, `403 FORBIDDEN`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`, `409 PUBLIC_CAMPAIGN_IMMUTABLE`.

Publico admin: dados de gestao.

Secreto para jogador: ids internos e campanhas nao ativas.

### POST `/api/v1/campaigns/admin/{campaignId}/status`

Autenticacao: bearer JWT com `ADMIN`.

Body:

```json
{
  "status": "ACTIVE"
}
```

Status aceitos: `ACTIVE`, `CLOSED`.

Resposta `200`: campanha com status atualizado.

Erros relevantes: `400 INVALID_CAMPAIGN_STATUS`, `403 FORBIDDEN`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`, `409 INVALID_PUBLIC_CAMPAIGN_TRANSITION`, `409 PUBLIC_CAMPAIGN_CLOSED`.

### GET `/api/v1/campaigns/admin/{campaignId}/operations`

Autenticacao: bearer JWT com `ADMIN`.

Resposta `200`:

```json
{
  "success": true,
  "operationalOverview": {
    "campaign": {
      "id": "campaign-id",
      "slug": "piloto-bravantus",
      "title": "Piloto Bravantus",
      "status": "ACTIVE",
      "builderConfigVersion": "pilot-v1",
      "consentVersion": "research-pilot-v1"
    },
    "table": {
      "id": "table-id",
      "name": "Mesa Piloto",
      "status": "RECRUITING",
      "maxPlayers": 8
    },
    "participants": {
      "membershipsByRoleAndStatus": [
        { "role": "PLAYER", "status": "ACTIVE", "count": 4 }
      ]
    },
    "consents": [{ "status": "ACCEPTED", "count": 4 }],
    "characters": [{ "sheetStatus": "SUBMITTED", "count": 2 }],
    "aiSuggestions": [{ "status": "ACCEPTED", "count": 3 }],
    "finalSurvey": { "responses": 1 },
    "analytics": {
      "eventsByKey": [{ "eventKey": "campaign_joined", "count": 4 }],
      "latestEvents": []
    },
    "dossierSubmissions": [
      {
        "id": "character-id",
        "characterId": "character-id",
        "tableId": "table-id",
        "userId": "user-id",
        "user": {
          "id": "user-id",
          "name": "Jogador",
          "email": "jogador@example.com"
        },
        "character": {
          "id": "character-id",
          "name": "Ayla"
        },
        "creativeDossier": {
          "hook": "Juramento antigo"
        },
        "sheetStatus": "SUBMITTED",
        "submittedAt": "2026-08-05T12:00:00.000Z"
      }
    ],
    "characterSubmissions": []
  }
}
```

Erros relevantes: `403 FORBIDDEN`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`.

Publico admin: agregados operacionais e eventos tecnicos.

Secreto: respostas narrativas, prompts integrais, ficha completa, conteudo de Mestre. `dossierSubmissions` e `characterSubmissions` sao dados administrativos e nao devem ser expostos para jogadores.

## Personagem na mesa

### POST `/api/v1/tables/{tableId}/characters`

Autenticacao: bearer JWT; membership ativa `PLAYER`.

Path params:

- `tableId`.

Body exemplo:

```json
{
  "name": "Ayla",
  "archetypeKey": "guardian_blade",
  "attributes": {
    "strength": 3,
    "agility": 2,
    "vigor": 2,
    "intellect": 1,
    "presence": 2,
    "spirit": 2
  },
  "trainings": ["combat", "defense", "survival"],
  "positiveTrait": "Esperanca de Bravantus",
  "negativeTrait": "Medo da Ascensao",
  "creativeDossier": {
    "hook": "Juramento ao Salao",
    "conflict": "Medo da Ascensao"
  },
  "bond": "Juramento ao Salao",
  "equipment": [
    {
      "slot": "main_hand",
      "name": "Espada comum",
      "description": "Item comum descrito pelo jogador"
    }
  ]
}
```

Resposta `201`:

```json
{
  "success": true,
  "character": {
    "id": "character-id",
    "tableId": "table-id",
    "userId": "user-id",
    "name": "Ayla",
    "creativeDossier": {
      "hook": "Juramento ao Salao",
      "conflict": "Medo da Ascensao"
    },
    "sheetStatus": "DRAFT",
    "derivedResources": {
      "hp": 18,
      "energy": 10,
      "ascensionPoints": 4
    }
  }
}
```

Erros relevantes: `400 VALIDATION_ERROR`, `400 BUILDER_INVALID_*`, `403 TABLE_PLAYER_REQUIRED`, `409 TABLE_CHARACTER_ALREADY_EXISTS`.

Publico ao proprio jogador: seu rascunho e recursos derivados.

Secreto: dados de outros personagens, aprovacao interna, conteudo de Mestre.

### GET `/api/v1/tables/{tableId}/characters/me`

Autenticacao: bearer JWT; membership ativa.

Resposta `200`:

```json
{
  "success": true,
  "character": {
    "id": "character-id",
    "tableId": "table-id",
    "ownerUserId": "user-id",
    "name": "Ayla",
    "concept": "Guardia em formacao",
    "attributes": {
      "strength": 2,
      "agility": 2,
      "vigor": 2,
      "intellect": 2,
      "presence": 2,
      "spirit": 2
    },
    "derivedResources": {
      "builderConfigVersion": "pilot-v1",
      "hp": 18,
      "energy": 10,
      "ascensionPoints": 4
    },
    "sheetStatus": "CHANGES_REQUESTED",
    "sheetRevision": 4,
    "submittedRevision": 3,
    "submittedAt": "2026-08-11T12:00:00.000Z",
    "approvedAt": null,
    "editable": true,
    "nextAction": {
      "key": "UPDATE_CHARACTER",
      "title": "Ajustar personagem"
    },
    "masterFeedback": "Ajustar promessa.",
    "latestSubmission": {
      "id": "submission-snapshot-id",
      "sheetRevision": 3,
      "submittedAt": "2026-08-11T12:00:00.000Z",
      "builderConfigVersion": "pilot-v1",
      "contextVersionId": "context-version-id"
    },
    "approvedSubmission": null,
    "episodeAnswers": [
      {
        "questionKey": "relationship_with_erya",
        "promptSnapshot": "{\"builderConfigVersion\":\"pilot-v1\",\"questionVersion\":\"pilot-v1\"}",
        "answer": "Erya me salvou na muralha."
      }
    ]
  }
}
```

Quando nao houver personagem, o contrato pode retornar `character: null`.

Erros relevantes: `403 FORBIDDEN`, `404 TABLE_NOT_FOUND`.

Publico ao proprio jogador: ficha completa propria, respostas do Episodio 1, recursos derivados, feedback do Mestre e referencias de snapshot.

Secreto: outros personagens e dados de Mestre.

### PATCH `/api/v1/tables/{tableId}/characters/{characterId}`

Autenticacao: bearer JWT; dono do personagem e `PLAYER` ativo.

Body: mesmos campos editaveis do rascunho.

Resposta `200`: personagem atualizado.

Erros relevantes: `400 VALIDATION_ERROR`, `403 CHARACTER_FORBIDDEN`, `404 TABLE_CHARACTER_NOT_FOUND`, `409 CHARACTER_NOT_EDITABLE`.

Publico ao proprio jogador: seu rascunho atualizado.

Secreto: feedback interno nao permitido, dados de outros personagens.

### PATCH `/api/v1/tables/{tableId}/characters/{characterId}/episode-answers`

Autenticacao: bearer JWT; dono do personagem e `PLAYER` ativo.

Body:

```json
{
  "answers": [
    {
      "questionKey": "relationship_with_erya",
      "answer": "Erya me salvou na muralha."
    },
    {
      "questionKey": "protection_in_bravantus",
      "answer": "Quero proteger minha irma em Bravantus."
    },
    {
      "questionKey": "past_connection_to_mandukuru",
      "answer": "Vi sinais antigos antes de chegar."
    },
    {
      "questionKey": "fear_of_guardian_souls",
      "answer": "Tenho medo de perder minha propria vontade."
    }
  ]
}
```

Resposta `200`: personagem com respostas salvas e snapshot backend da pergunta.

Erros relevantes: `400 INVALID_EPISODE_QUESTION`, `403 CHARACTER_FORBIDDEN`, `409 CHARACTER_NOT_EDITABLE`.

Publico ao proprio jogador e Mestre apos envio: respostas do jogador.

Secreto: perguntas secretas, revelacoes canonicas, dados sobre Zurich, segredo de Mestre.

### POST `/api/v1/tables/{tableId}/characters/{characterId}/submit`

Autenticacao: bearer JWT; dono do personagem e `PLAYER` ativo.

Body: vazio.

Resposta `200`:

```json
{
  "success": true,
  "character": {
    "id": "character-id",
    "sheetStatus": "SUBMITTED",
    "submittedRevision": 1
  }
}
```

Erros relevantes: `400 CHARACTER_SHEET_INCOMPLETE`, `403 CHARACTER_FORBIDDEN`, `404 TABLE_CHARACTER_NOT_FOUND`, `409 CHARACTER_NOT_EDITABLE`.

Publico ao proprio jogador: status de submissao.

Secreto: fila completa do Mestre, dados de outros jogadores.

Observacao de snapshot: cada submissao cria um registro imutavel de `CharacterSubmissionSnapshot` com `sheetRevision`, `submittedById`, `submittedAt`, `builderConfigVersion`, `contextVersionId`, `characterSnapshot` e `episodeAnswersSnapshot`. Ressubmissoes criam novos snapshots e nao sobrescrevem snapshots anteriores. A aprovacao do Mestre marca o snapshot da revisao efetivamente aprovada.

## IA assistiva do jogador

### POST `/api/v1/tables/{tableId}/player-ai/character-help`

Autenticacao: bearer JWT; membership ativa `PLAYER`.

Path params:

- `tableId`.

Body:

```json
{
  "useCase": "PLAYER_CHARACTER_CREATION",
  "characterId": "character-id",
  "instruction": "Me ajude a deixar meu vinculo mais claro sem mudar minha escolha."
}
```

Para `PLAYER_CHARACTER_VALIDATION`, `characterId` e obrigatorio.

Resposta `200`:

```json
{
  "success": true,
  "suggestion": {
    "suggestions": [
      {
        "id": "suggestion-id",
        "targetField": "bond",
        "suggestion": "Voce pode escrever que seu juramento ao Salao nasceu de uma promessa feita antes da muralha cair.",
        "rationale": "Mantem sua escolha e melhora clareza narrativa.",
        "playerAction": "Aceite, edite ou descarte."
      }
    ],
    "warnings": []
  }
}
```

Erros relevantes: `400 INVALID_PLAYER_AI_USE_CASE`, `400 CHARACTER_ID_REQUIRED`, `403 AI_CONTEXT_PLAYER_REQUIRED`, `404 TABLE_CHARACTER_NOT_FOUND`, `429 AI_RATE_LIMITED`, `503 AI_NOT_CONFIGURED`.

Publico ao proprio jogador: sugestoes estruturadas e avisos seguros.

Secreto: prompt integral, contexto secreto, `gm_secret`, dados de outros personagens. A resposta nao altera ficha.

### PATCH `/api/v1/tables/{tableId}/player-ai/suggestions/{suggestionId}/decision`

Autenticacao: bearer JWT; dono da sugestao e `PLAYER` ativo.

Path params:

- `tableId`.
- `suggestionId`.

Body para aceitar:

```json
{
  "decision": "ACCEPTED"
}
```

Body para editar:

```json
{
  "decision": "EDITED",
  "editedSuggestion": "Meu juramento ao Salao nasceu da promessa que fiz ao meu mentor."
}
```

Body para descartar:

```json
{
  "decision": "DISCARDED"
}
```

Resposta `200`:

```json
{
  "success": true,
  "suggestion": {
    "id": "suggestion-id",
    "status": "EDITED",
    "decisionPayload": {
      "decision": "EDITED",
      "editedSuggestion": "Meu juramento ao Salao nasceu da promessa que fiz ao meu mentor."
    },
    "decidedAt": "2026-08-04T12:00:00.000Z"
  }
}
```

Erros relevantes: `400 INVALID_AI_SUGGESTION_DECISION`, `400 EDITED_SUGGESTION_REQUIRED`, `403 TABLE_PLAYER_REQUIRED`, `404 PLAYER_AI_SUGGESTION_NOT_FOUND`, `409 PLAYER_AI_SUGGESTION_ALREADY_DECIDED`.

Publico ao proprio jogador: status da sugestao e decisao.

Secreto: prompts, contexto secreto, dados de outros usuarios. Decidir sugestao nao altera ficha automaticamente.

## Pesquisa final

### GET `/api/v1/campaigns/public/final-survey`

Autenticacao: publico.

Resposta `200`:

```json
{
  "success": true,
  "finalSurvey": {
    "version": "pilot-v1",
    "questions": [
      {
        "questionKey": "character_understanding_score",
        "prompt": "Voce entendeu quem era seu personagem e por que ele participaria do episodio?",
        "format": "SCALE_1_5",
        "required": true
      }
    ]
  }
}
```

Publico: perguntas e versao.

Secreto: respostas dos participantes.

### GET `/api/v1/campaigns/public/{slug}/final-survey/me`

Autenticacao: bearer JWT; `PLAYER` ativo da campanha.

Resposta `200`:

```json
{
  "success": true,
  "finalSurveyResponse": {
    "id": "survey-response-id",
    "surveyVersion": "pilot-v1",
    "answers": {
      "character_understanding_score": 5,
      "creation_experience_score": 4,
      "ai_helpfulness_score": "NOT_USED",
      "ai_boundary_problem": false,
      "ai_boundary_problem_details": null,
      "story_impact_score": 5,
      "final_comment": "Comentario opcional"
    },
    "submittedAt": "2026-08-04T12:00:00.000Z"
  }
}
```

Quando nao houver resposta: `finalSurveyResponse: null`.

Erros relevantes: `401 AUTH_REQUIRED`, `403 CAMPAIGN_PLAYER_REQUIRED`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`.

Publico ao proprio jogador: sua resposta.

Secreto: respostas de outros participantes.

### PUT `/api/v1/campaigns/public/{slug}/final-survey/me`

Autenticacao: bearer JWT; `PLAYER` ativo da campanha.

Body:

```json
{
  "characterUnderstandingScore": 5,
  "creationExperienceScore": 4,
  "aiHelpfulnessScore": "NOT_USED",
  "aiBoundaryProblem": false,
  "storyImpactScore": 5,
  "finalComment": "Gostei do fluxo."
}
```

Com problema de limite da IA:

```json
{
  "characterUnderstandingScore": 4,
  "creationExperienceScore": 3,
  "aiHelpfulnessScore": 2,
  "aiBoundaryProblem": true,
  "aiBoundaryProblemDetails": "A sugestao pareceu obrigatoria.",
  "storyImpactScore": 4
}
```

Resposta `200`: resposta persistida/atualizada.

Erros relevantes: `400 VALIDATION_ERROR`, `401 AUTH_REQUIRED`, `403 CAMPAIGN_PLAYER_REQUIRED`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`.

Publico ao proprio jogador: resposta salva.

Secreto: respostas de outros participantes. Analytics nao deve copiar respostas narrativas.

## Analytics do piloto

### POST `/api/v1/campaigns/public/{slug}/events`

Autenticacao: bearer JWT.

Body:

```json
{
  "eventKey": "builder_step_completed",
  "characterId": "character-id",
  "sessionId": "browser-session-id",
  "source": "frontend",
  "metadata": {
    "step": "attributes",
    "metadataVersion": "pilot-v1"
  }
}
```

Resposta `201`:

```json
{
  "success": true,
  "analyticsEvent": {
    "id": "event-id",
    "eventKey": "builder_step_completed",
    "occurredAt": "2026-08-04T12:00:00.000Z",
    "userId": "user-id",
    "campaignId": "campaign-id",
    "tableId": "table-id",
    "characterId": "character-id",
    "sessionId": "browser-session-id",
    "source": "frontend",
    "metadataVersion": "pilot-v1"
  }
}
```

Erros relevantes: `400 INVALID_ANALYTICS_EVENT`, `400 ANALYTICS_METADATA_FORBIDDEN`, `403 CHARACTER_FORBIDDEN`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`.

Publico ao backend/frontend: confirmacao do evento e id tecnico.

Secreto: metadata com prompt, ficha, respostas narrativas, token, senha ou segredo.

## Rotas tecnicas

### GET `/health`

Autenticacao: publico.

Resposta `200`:

```json
{
  "success": true,
  "status": "ok"
}
```

### GET `/ready`

Autenticacao: publico.

Resposta `200` quando o banco responde:

```json
{
  "success": true,
  "status": "ready"
}
```

Erros relevantes: erro de conexao com banco.

### GET `/docs.json`

Autenticacao: publico.

Resposta `200`: documento OpenAPI.

Publico: contratos tecnicos.

Secreto: nenhum valor de `.env`, credenciais ou tokens.

### GET `/docs`

Autenticacao: publico.

Resposta `200`: Swagger UI.

### GET `/api/v1/meta/version`

Autenticacao: publico.

Resposta `200`:

```json
{
  "success": true,
  "name": "gob-backend",
  "version": "1.3.0",
  "environment": "development"
}
```

Publico: nome, versao e ambiente.

Secreto: variaveis de ambiente e credenciais.
