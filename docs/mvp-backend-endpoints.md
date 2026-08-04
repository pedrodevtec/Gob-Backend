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
    }
  }
}
```

Erros relevantes: `403 FORBIDDEN`, `404 PUBLIC_CAMPAIGN_NOT_FOUND`.

Publico admin: agregados operacionais e eventos tecnicos.

Secreto: respostas narrativas, prompts integrais, ficha completa, conteudo de Mestre.

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
  "character": {}
}
```

Quando nao houver personagem, o contrato pode retornar `character: null`.

Erros relevantes: `403 FORBIDDEN`, `404 TABLE_NOT_FOUND`.

Publico ao proprio jogador: seu personagem.

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
