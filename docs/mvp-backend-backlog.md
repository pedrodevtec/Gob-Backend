# Backlog backend do MVP

Este backlog foi gerado por inspecao do backend em 2026-08-04. A auditoria leu a estrutura do repositorio, `package.json`, `.env.example`, Prisma schema/migrations, modulos, rotas, controllers, services, schemas de validacao, middlewares de autenticacao/autorizacao, OpenAPI, documentacao tecnica e documentos do Bravantus disponiveis localmente.

Nao foram criadas tasks para capacidades ja concluidas. Capacidades parciais geram tasks somente para a parte faltante.

## Diagnostico por capacidade

| Capacidade | Status | Evidencia |
|---|---|---|
| Configuracao oficial e versionada do Character Builder | CONCLUIDA | Decisao aprovada pelo Product Owner para `pilot-v1`; `src/Modules/builder/builder.config.ts` e `GET /api/v1/builder/configs/active` disponibilizam a configuracao versionada. |
| Contratos de criacao, atualizacao e retomada de rascunho | CONCLUIDA | `src/Modules/tables/tableCharacterPackage03.service.ts`, `table.routes.ts` e `table.schema.ts` implementam draft/update/me com validacao contra Builder `pilot-v1`; OpenAPI foi alinhado. |
| Revisao e submissao do personagem | CONCLUIDA | `TableCharacterPackage03Service.submit`, `requestChanges`, `approve`, `CharacterReviewEvent` e `CharacterSheetStatus` implementam ciclo `DRAFT`/`SUBMITTED`/`CHANGES_REQUESTED`/`APPROVED`. |
| Perguntas contextuais do Episodio 1 | CONCLUIDA | `CharacterEpisodeAnswer` persiste respostas por `questionKey`; `BuilderService` valida chaves oficiais e a submissao exige as quatro perguntas do `pilot-v1`. |
| Campanha publica acessada por slug | CONCLUIDA | `PublicCampaign` persiste slug unico; `GET /api/v1/campaigns/public/:slug` retorna landing publica sem revelar indisponibilidade interna. |
| Consentimento do participante | CONCLUIDA | `ParticipantConsent` registra `consentVersion`, status, origem e datas; `GET /api/v1/campaigns/public/consent` expõe o documento versionado. |
| Entrada automatica e segura na mesa | CONCLUIDA | `POST /api/v1/campaigns/public/:slug/join` exige campanha ativa, mesa recrutando, vaga e consentimento aceito. |
| Retomada da campanha | CONCLUIDA | `GET /api/v1/campaigns/public/:slug/resume` retorna campanha, consentimento, membership e `playerOverview` quando aplicavel. |
| IA assistiva do jogador | CONCLUIDA | `POST /api/v1/tables/:tableId/player-ai/character-help` usa `AiContextService`, Builder `pilot-v1`, schema estruturado e nao salva ficha. |
| Registro de sugestoes aceitas, editadas ou descartadas | CONCLUIDA | `PlayerAiSuggestion` persiste snapshot da sugestao assistiva; `PATCH /api/v1/tables/:tableId/player-ai/suggestions/:suggestionId/decision` registra `ACCEPTED`, `EDITED` ou `DISCARDED`. |
| Pesquisa final | CONCLUIDA | `FinalSurveyResponse` persiste uma resposta ativa por usuario/campanha; `GET/PUT /api/v1/campaigns/public/:slug/final-survey/me` expõe consulta e submissao. |
| Eventos minimos de analytics | CONCLUIDA | `AnalyticsEvent` persiste chaves oficiais; `POST /api/v1/campaigns/public/:slug/events` registra eventos permitidos e fluxos backend registram eventos centrais. |
| Consultas necessarias ao painel operacional | CONCLUIDA | `GET /api/v1/campaigns/admin/:campaignId/operations` retorna agregados por campanha, mesa, consentimentos, personagens, IA, pesquisa e eventos. |
| Preparacao da API para o piloto | CONCLUIDA | OpenAPI cobre contratos do MVP implementados; `.env.example` foi revisado; `docs/pilot-api-validation.md` registra validacao manual permitida. |
| Validacao em Supabase exclusivo de testes | BLOQUEADA POR AMBIENTE | CI condiciona integracoes a `TEST_DATABASE_URL` e `TEST_DATABASE_CONFIRMED_DISPOSABLE`; docs registram que suites reais exigem PostgreSQL/Supabase descartavel. |

## BRA-BE-01 — Decisoes pendentes do Character Builder

**Camada:** Backend  
**Prioridade:** P0  
**Status atual:** Concluida por decisao  
**Depende de:** nenhuma  
**Desbloqueia:** BRA-BE-02, BRA-BE-03, BRA-BE-04 e contratos do frontend

### Objetivo

Registrar as decisoes humanas que bloqueiam a configuracao oficial e versionada do Character Builder.

### Evidencia atual

- `docs/character-package-03.md` declara que nao ha catalogo autoritativo de arquetipos, atributos, treinos, equipamentos e perguntas exatas.
- `TableCharacterPackage03Service` valida forma e integridade, nao catalogo de produto.
- `ContextVersion` persiste contexto narrativo, mas nao configuracao de Builder.
- O Product Owner aprovou a Configuracao Oficial do Piloto v1 com versao `pilot-v1`.

### Implementacao necessaria

- [x] Obter decisao do Product Owner sobre catalogos oficiais do Builder: arquetipos, atributos, treinos, traits, equipamentos iniciais e limites de distribuicao.
- [x] Obter decisao sobre as perguntas contextuais obrigatorias do Episodio 1 e suas chaves estaveis.
- [x] Obter decisao sobre identificador publico de campanha: formato de slug, unicidade e relacao com mesa/episodio/contexto.
- [x] Obter decisao sobre texto/versao de consentimento do participante e momento de aceite.
- [x] Obter decisao sobre campos da pesquisa final e eventos minimos de analytics.

### Contrato disponibilizado ao frontend

- Endpoints envolvidos: nenhum endpoint novo nesta task.
- Metodo HTTP: nao aplicavel.
- Autenticacao necessaria: nao aplicavel.
- Dados principais de entrada: decisoes humanas registradas em documentacao/versionamento.
- Estrutura principal de saida: backlog/decisao aprovada para orientar contratos futuros.
- Estados e erros esperados: nao aplicavel.
- Contrato: ainda sera criado nas tasks desbloqueadas.

### Criterios de aprovacao

- Decisoes humanas estao registradas de forma rastreavel no repositorio ou em referencia aprovada.
- Cada decisao separa regra oficial de hipotese.
- Nenhuma regra secreta do episodio e incorporada em contrato publico.
- As perguntas obrigatorias do Episodio 1 possuem chaves estaveis.
- Consentimento e survey possuem versao ou identificador estavel.

### Validacao permitida

- Inspecao do codigo.
- Consulta manual ao OpenAPI.

### Fora do escopo

- Implementar endpoints.
- Criar modelos Prisma.
- Definir regras do RPG por inferencia.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-02 — Configuracao oficial e versionada do Builder

**Camada:** Backend  
**Prioridade:** P0  
**Status atual:** Concluida  
**Depende de:** BRA-BE-01  
**Desbloqueia:** BRA-BE-03, BRA-BE-06, BRA-BE-07 e contratos do frontend

### Objetivo

Disponibilizar uma configuracao oficial, versionada e segura do Character Builder para o fluxo do jogador.

### Evidencia atual

- `src/Modules/builder/builder.config.ts` registra `pilot-v1` como configuracao oficial aprovada.
- `src/Modules/builder/builder.routes.ts` expoe `GET /api/v1/builder/configs/active` e `GET /api/v1/builder/configs/:version`.
- `src/Modules/context` expoe contexto publicado, nao catalogos de Builder.
- `src/Modules/tables/table.schema.ts` valida campos de ficha sem conferir catalogo autoritativo.
- `docs/character-builder-pilot-v1.md` documenta o contrato e a fonte de verdade.

### Implementacao necessaria

- [x] Criar configuracao versionada oficial do Builder conforme decisao aprovada.
- [x] Expor endpoint de leitura da configuracao publicada adequada ao jogador.
- [x] Garantir que a resposta contenha somente informacoes publicas/permitidas ao jogador.
- [x] Incluir perguntas contextuais obrigatorias do Episodio 1 conforme decisao aprovada.
- [x] Sincronizar OpenAPI e documentacao tecnica.

### Contrato disponibilizado ao frontend

- Endpoint: `GET /api/v1/builder/configs/active` e `GET /api/v1/builder/configs/:version`.
- Metodo HTTP: `GET`.
- Autenticacao necessaria: nenhuma para leitura da configuracao oficial do piloto.
- Entrada principal: `version` opcional quando a leitura for por versao.
- Saida principal: `builderConfig` com `version`, catalogos oficiais, perguntas, limites, campos obrigatorios e metadados publicos.
- Estados e erros esperados: `404` configuracao inexistente, `500` bloqueio por marcador protegido na configuracao.
- Contrato: criado.

### Criterios de aprovacao

- Endpoint retorna configuracao versionada do Builder.
- Configuracao publicada e imutavel ou versionada sem sobrescrever historico.
- Resposta do jogador nao contem `SECRET_CANON`, `TABLE_MASTER`, `AUTHOR_ADMIN` ou marcadores secretos.
- Perguntas do Episodio 1 saem da configuracao oficial, nao de constante solta no frontend.
- OpenAPI descreve entradas, saidas e erros principais.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- Frontend.
- Regras de combate, rolagens ou sessoes.
- Inventar catalogos sem decisao aprovada.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-03 — Complementacao dos contratos de personagem

**Camada:** Backend  
**Prioridade:** P0  
**Status atual:** Concluida  
**Depende de:** BRA-BE-02  
**Desbloqueia:** BRA-BE-04, BRA-BE-05, BRA-BE-06 e contratos do frontend

### Objetivo

Alinhar criacao, atualizacao, retomada, perguntas e submissao de personagem ao Builder oficial versionado.

### Evidencia atual

- `POST /api/v1/tables/:tableId/characters` cria rascunho em `DRAFT`.
- `GET /api/v1/tables/:tableId/characters/me` retoma o personagem do jogador.
- `PATCH /api/v1/tables/:tableId/characters/:characterId` atualiza rascunho editavel.
- `PATCH /api/v1/tables/:tableId/characters/:characterId/episode-answers` salva respostas.
- `POST /api/v1/tables/:tableId/characters/:characterId/submit` submete para revisao.
- `BuilderService` valida catalogos, atributos, treinos, equipamentos e perguntas contra `pilot-v1`.
- `src/docs/openapi.ts` descreve rascunho, retomada, respostas, submissao e revisao.

### Implementacao necessaria

- [x] Validar `archetypeKey`, atributos, treinos, traits, equipamentos e perguntas contra a configuracao oficial vigente.
- [x] Registrar snapshot de versao das perguntas obrigatorias a partir do backend.
- [x] Ajustar OpenAPI para refletir rascunho, retomada, estados e erros reais.
- [x] Manter bloqueio de edicao para `SUBMITTED` e `APPROVED`.
- [x] Garantir mensagens/erros estaveis para configuracao ausente, pergunta obrigatoria ausente e catalogo invalido.

### Contrato disponibilizado ao frontend

- Endpoints existentes: `POST /api/v1/tables/{tableId}/characters`, `GET /api/v1/tables/{tableId}/characters/me`, `GET /api/v1/tables/{tableId}/characters/{characterId}`, `PATCH /api/v1/tables/{tableId}/characters/{characterId}`, `PATCH /api/v1/tables/{tableId}/characters/{characterId}/episode-answers`, `POST /api/v1/tables/{tableId}/characters/{characterId}/submit`.
- Metodo HTTP: `GET`, `POST`, `PATCH`.
- Autenticacao necessaria: bearer JWT; membership ativa `PLAYER` para criar/editar/submeter; `MASTER` para leitura de fichas submetidas/aprovadas.
- Entrada principal: campos de ficha, respostas por `questionKey`, identificadores oficiais definidos no Builder.
- Saida principal: `character` com ficha, `sheetStatus`, `sheetRevision`, `submittedRevision`, respostas e eventos de revisao permitidos.
- Estados e erros esperados: `DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`, `APPROVED`; `403`, `404`, `409`, `CHARACTER_SHEET_INCOMPLETE`, `CHARACTER_NOT_EDITABLE`.
- Contrato: complementado.

### Criterios de aprovacao

- Usuario so cria e atualiza o proprio rascunho na mesa.
- Personagem submetido nao pode ser alterado como rascunho.
- Submissao exige todas as perguntas obrigatorias da configuracao vigente.
- Identificadores enviados pelo cliente sao validados contra catalogo oficial.
- OpenAPI descreve retomada do rascunho e transicoes reais.
- Conteudo secreto nunca aparece na resposta destinada ao jogador.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- Criar interface frontend.
- Automatizar aprovacao de personagem.
- Combate, rolagens e sessoes.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-04 — Campanha publica, consentimento e entrada segura

**Camada:** Backend  
**Prioridade:** P0  
**Status atual:** Concluida  
**Depende de:** BRA-BE-01, BRA-BE-03  
**Desbloqueia:** BRA-BE-05, BRA-BE-08, BRA-BE-09 e contratos do frontend

### Objetivo

Permitir que um participante acesse a campanha publica por slug, aceite consentimento versionado e seja vinculado com seguranca a mesa configurada.

### Evidencia atual

- `PublicCampaign` persiste `slug`, status, versao do Builder e versao do consentimento.
- `ParticipantConsent` persiste consentimento por usuario/campanha/versao.
- `GET /api/v1/campaigns/public/:slug` retorna landing publica para campanha ativa.
- `POST /api/v1/campaigns/public/:slug/consent` registra aceite ou recusa.
- `POST /api/v1/campaigns/public/:slug/join` vincula o usuario somente a mesa da campanha quando elegivel.

### Implementacao necessaria

- [x] Criar modelo/contrato de campanha publica conforme decisao de slug.
- [x] Expor leitura publica segura por slug com dados publicos da campanha.
- [x] Persistir consentimento versionado por usuario/participante antes da entrada quando exigido.
- [x] Implementar entrada autenticada por slug vinculando o usuario somente a mesa configurada.
- [x] Impedir entrada em mesa fechada, lotada, nao publicada ou inconsistente com contexto/Builder.
- [x] Atualizar OpenAPI e documentacao tecnica.

### Contrato disponibilizado ao frontend

- Endpoints envolvidos: `GET /api/v1/campaigns/public/:slug`, `GET /api/v1/campaigns/public/consent`, `POST /api/v1/campaigns/public/:slug/consent`, `POST /api/v1/campaigns/public/:slug/join`, rotas administrativas em `/api/v1/campaigns/admin`.
- Metodo HTTP: `GET` para campanha publica; `POST` para consentimento/entrada.
- Autenticacao necessaria: leitura publica conforme decisao; consentimento/entrada com bearer JWT se a participacao exigir conta.
- Entrada principal: `slug`, versao de consentimento aceita e metadados minimos permitidos.
- Saida principal: dados publicos da campanha, estado de consentimento, `tableId`/membership quando entrada for concluida.
- Estados e erros esperados: `404` slug inexistente, `409` campanha indisponivel/mesa cheia/consentimento desatualizado, `403` usuario nao elegivel.
- Contrato: criado.

### Criterios de aprovacao

- Campanha publica por slug nao revela contexto secreto.
- Entrada por slug vincula o usuario somente a mesa configurada.
- Consentimento versionado e registrado antes de liberar participacao quando exigido.
- Reentrada idempotente nao duplica membership.
- Mesa fora de recrutamento ou lotada rejeita novos participantes.
- OpenAPI descreve fluxo publico e autenticado.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- Frontend publico.
- Modo espectador.
- Migração para Hostinger.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-05 — Retomada da campanha pelo jogador

**Camada:** Backend  
**Prioridade:** P0  
**Status atual:** Concluida  
**Depende de:** BRA-BE-04  
**Desbloqueia:** BRA-BE-06, BRA-BE-08 e contratos do frontend

### Objetivo

Fornecer ao jogador um estado unico de retomada da campanha a partir da campanha publica ou mesa vinculada.

### Evidencia atual

- `GET /api/v1/tables/dashboard` consolida mesas do usuario.
- `GET /api/v1/tables/:tableId/player/overview` retorna mundo, personagem, traits, sugestoes, missoes, submissions, timeline e proxima acao.
- `TableService.buildPlayerNextAction` define a proxima acao local da mesa.
- `GET /api/v1/campaigns/public/:slug/resume` retoma o fluxo pelo slug publico.

### Implementacao necessaria

- [x] Expor consulta de retomada para a campanha do MVP por slug.
- [x] Retornar estado de consentimento, membership, personagem, revisao, Builder, missoes e proxima acao em formato estavel.
- [x] Tratar usuario sem consentimento, sem membership, sem personagem, com rascunho, aguardando revisao, aprovado ou com ajustes solicitados.
- [x] Evitar retorno de dados de outras mesas/campanhas.
- [x] Atualizar OpenAPI.

### Contrato disponibilizado ao frontend

- Endpoint: `GET /api/v1/campaigns/public/:slug/resume`.
- Metodo HTTP: `GET`.
- Autenticacao necessaria: bearer JWT.
- Entrada principal: `slug` ou identificador aprovado da campanha.
- Saida principal: `campaign`, `consent`, `membership`, `character`, `builderConfig`, `nextRecommendedAction`, resumos de missoes/timeline permitidos.
- Estados e erros esperados: sem consentimento, sem membership, sem personagem, rascunho, submetido, ajustes solicitados, aprovado; `403`, `404`, `409`.
- Contrato: complementado.

### Criterios de aprovacao

- Jogador consegue retomar o fluxo sem conhecer `tableId` previamente quando slug for o ponto de entrada.
- Estado retornado diferencia ausencia de personagem, rascunho, submissao pendente, ajustes e aprovacao.
- Resposta inclui apenas dados da campanha/mesa vinculada.
- Conteudo secreto nunca aparece na resposta do jogador.
- OpenAPI documenta a estrutura principal de retomada.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- Conducao de sessao.
- Combate e rolagens.
- Crônica da Mesa.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-06 — IA assistiva do jogador

**Camada:** Backend  
**Prioridade:** P0  
**Status atual:** Concluida  
**Depende de:** BRA-BE-03, BRA-BE-05  
**Desbloqueia:** BRA-BE-07 e contratos do frontend

### Objetivo

Disponibilizar IA assistiva para o jogador sugerir melhorias de ficha sem alterar dados automaticamente.

### Evidencia atual

- `AiContextService.buildPlayerCharacterContext` monta contexto seguro para `PLAYER_CHARACTER_CREATION` e `PLAYER_CHARACTER_VALIDATION`.
- `playerAi.routes.ts` expoe `POST /api/v1/tables/:tableId/player-ai/character-help` para PLAYER ativo.
- `AiClient` usa schema JSON estrito, `store: false`, timeout e erro `AI_NOT_CONFIGURED`.
- `docs/ai-context-package-04.md` proibe vazamento de segredo para IA do jogador.

### Implementacao necessaria

- [x] Criar endpoint de IA do jogador usando `AiContextService`.
- [x] Definir schema de saida para sugestoes de criacao/validacao do personagem conforme Builder oficial.
- [x] Garantir que a sugestao nao salve nem altere a ficha automaticamente.
- [x] Aplicar rate limit e autenticacao por jogador/mesa.
- [x] Bloquear contexto secreto e dados de outros personagens.
- [x] Atualizar OpenAPI e documentacao.

### Contrato disponibilizado ao frontend

- Endpoint: `POST /api/v1/tables/:tableId/player-ai/character-help`.
- Metodo HTTP: `POST`.
- Autenticacao necessaria: bearer JWT; membership ativa `PLAYER` da mesa; personagem proprio quando `characterId` for enviado.
- Entrada principal: `useCase`, `characterId` opcional/obrigatorio conforme uso, pergunta/instrucao do jogador dentro dos limites definidos.
- Saida principal: sugestoes estruturadas, avisos e referencias de origem permitidas.
- Estados e erros esperados: `AI_NOT_CONFIGURED`, `AI_CONTEXT_PLAYER_REQUIRED`, `AI_CONTEXT_SECRET_LEAK_BLOCKED`, `AI_RATE_LIMITED`, `403`, `404`, `503`.
- Contrato: criado.

### Criterios de aprovacao

- IA sugere; jogador decide; backend nao modifica ficha automaticamente.
- Conteudo secreto nunca aparece no prompt nem na resposta destinada ao jogador.
- Jogador nao consegue gerar sugestao com personagem de outro usuario ou outra mesa.
- Endpoint retorna erro claro quando IA nao esta configurada.
- Rate limit especifico protege o endpoint.
- OpenAPI documenta entrada, saida e erros principais.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- IA do Mestre ja existente, exceto reaproveitamento de padroes.
- Aplicacao automatica de sugestoes.
- Novas regras de RPG.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-07 — Registro de sugestoes aceitas, editadas ou descartadas

**Camada:** Backend  
**Prioridade:** P0  
**Status atual:** Concluida  
**Depende de:** BRA-BE-06  
**Desbloqueia:** BRA-BE-08, BRA-BE-09 e contratos do frontend

### Objetivo

Registrar a decisao do jogador sobre sugestoes assistivas, preservando snapshot, edicao e descarte sem aplicar mudancas automaticamente.

### Evidencia atual

- `PlayerAiSuggestion` persiste sugestoes assistivas do jogador com `GENERATED`, `ACCEPTED`, `EDITED` e `DISCARDED`.
- `PlayerAiService.suggestCharacterHelp` cria snapshot das sugestoes retornadas pela IA com versao do Builder, versao de prompt e modelo.
- `PATCH /api/v1/tables/:tableId/player-ai/suggestions/:suggestionId/decision` registra a decisao do jogador sem alterar a ficha.
- `CharacterTraitSuggestion` permanece como fluxo separado de sugestoes de traits do Mestre.

### Implementacao necessaria

- [x] Criar persistencia para sugestoes assistivas do jogador e seu resultado.
- [x] Registrar snapshot da sugestao, versao do Builder/contexto, decisao do jogador e payload editado quando houver.
- [x] Expor endpoints para aceitar, aceitar editado e descartar sugestao.
- [x] Garantir que aceitar sugestao nao altere a ficha sem chamada explicita de update existente.
- [x] Atualizar OpenAPI e documentacao.

### Contrato disponibilizado ao frontend

- Endpoints: `POST /api/v1/tables/:tableId/player-ai/character-help`; `PATCH /api/v1/tables/:tableId/player-ai/suggestions/:suggestionId/decision`.
- Metodo HTTP: `POST` para gerar sugestoes; `PATCH` para registrar decisao.
- Autenticacao necessaria: bearer JWT; dono do personagem e `PLAYER` ativo da mesa.
- Entrada principal: `useCase`, `characterId` e instrucao opcional na geracao; `suggestionId`, decisao (`ACCEPTED`, `EDITED`, `DISCARDED`) e `editedSuggestion` quando aplicavel.
- Saida principal: registro da sugestao com status, snapshot, decisao, timestamps e referencias permitidas.
- Estados e erros esperados: sugestao inexistente, sugestao de outro usuario, sugestao ja processada, `AI_NOT_CONFIGURED`, `AI_CONTEXT_PLAYER_REQUIRED`, `403`, `404`, `409`, `429`, `503`.
- Contrato: criado.

### Criterios de aprovacao

- Sugestao aceita nao modifica a ficha automaticamente.
- Sugestao editada preserva snapshot original e versao editada.
- Sugestao descartada fica registrada e nao reaparece como pendente.
- Usuario so registra decisao em sugestao do proprio personagem.
- Conteudo secreto nunca e persistido ou retornado ao jogador.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- Aplicar trait de Mestre automaticamente.
- Analytics detalhado alem dos eventos minimos da task propria.
- Frontend de comparacao de sugestoes.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-08 — Pesquisa final e eventos minimos de analytics

**Camada:** Backend  
**Prioridade:** P1  
**Status atual:** Concluida  
**Depende de:** BRA-BE-04, BRA-BE-07  
**Desbloqueia:** BRA-BE-09, BRA-BE-10 e contratos do frontend

### Objetivo

Registrar pesquisa final e eventos minimos do funil MVP para operacao e aprendizado do piloto.

### Evidencia atual

- `FinalSurveyResponse` registra respostas da pesquisa final com `surveyVersion`, usuario, campanha, mesa, papel e `submittedAt`.
- `AnalyticsEvent` registra `eventKey`, timestamps, usuario/campanha/mesa/personagem quando aplicavel, origem, sessao e `metadataVersion`.
- `GET /api/v1/campaigns/public/final-survey` expoe a configuracao versionada da pesquisa do jogador.
- `GET/PUT /api/v1/campaigns/public/:slug/final-survey/me` consulta/submete a pesquisa do participante.
- `POST /api/v1/campaigns/public/:slug/events` registra somente eventos oficiais e metadados tecnicos minimos.

### Implementacao necessaria

- [x] Criar persistencia de eventos minimos definidos pelo Product Owner.
- [x] Criar persistencia e endpoint de submissao da pesquisa final versionada.
- [x] Associar eventos a usuario, campanha/mesa, personagem e timestamps quando aplicavel.
- [x] Evitar armazenamento de segredos, tokens, autorizacao, prompts completos ou dados sensiveis desnecessarios.
- [x] Manter consulta operacional agregada para a task propria de painel operacional.
- [x] Atualizar OpenAPI e documentacao.

### Contrato disponibilizado ao frontend

- Endpoints: `GET /api/v1/campaigns/public/final-survey`, `GET /api/v1/campaigns/public/:slug/final-survey/me`, `PUT /api/v1/campaigns/public/:slug/final-survey/me`, `POST /api/v1/campaigns/public/:slug/events`.
- Metodo HTTP: `GET`, `PUT`, `POST`.
- Autenticacao necessaria: bearer JWT para consulta/submissao da propria pesquisa e registro de evento por campanha.
- Entrada principal: respostas oficiais da pesquisa; `eventKey` aprovado, `characterId`, `sessionId`, `source` e metadata tecnica permitida.
- Saida principal: configuracao da pesquisa, resposta persistida ou identificador do evento.
- Estados e erros esperados: evento desconhecido, payload invalido, campanha inexistente, participante sem membership, metadata proibida, `400`, `403`, `404`.
- Contrato: criado.

### Criterios de aprovacao

- Eventos minimos do fluxo do jogador sao persistidos com timestamp.
- Pesquisa final registra versao e respostas validadas.
- Payload nao armazena token, senha, segredo narrativo ou prompt sensivel.
- Usuario nao consegue enviar pesquisa para campanha/mesa que nao participou.
- OpenAPI documenta eventos permitidos e erros principais.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- Ferramenta externa de BI.
- Tracking frontend automatico fora dos eventos minimos.
- Relatorios complexos.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-09 — Consultas do painel operacional

**Camada:** Backend  
**Prioridade:** P1  
**Status atual:** Concluida  
**Depende de:** BRA-BE-08  
**Desbloqueia:** BRA-BE-10 e contratos do frontend

### Objetivo

Disponibilizar consultas suficientes para acompanhar operacao do piloto sem expor conteudo secreto ao jogador.

### Evidencia atual

- `GET /api/v1/tables/dashboard` retorna resumo do usuario autenticado.
- `GET /api/v1/tables/:tableId/master/overview` retorna painel do Mestre.
- `GET /api/v1/campaigns/admin/:campaignId/operations` retorna painel operacional agregado por campanha publica/piloto.
- `CampaignPilotService.getOperationalOverview` agrega participantes, consentimentos, personagens por status, sugestoes de IA, pesquisa final e analytics sem retornar ficha completa ou respostas narrativas.

### Implementacao necessaria

- [x] Definir e implementar consultas agregadas minimas para operacao do piloto.
- [x] Filtrar por campanha/slug/mesa conforme modelo aprovado.
- [x] Incluir contagens de participantes, consentimentos, personagens por status, sugestoes, pesquisa e eventos minimos.
- [x] Restringir acesso a papel operacional aprovado, sem tratar `ADMIN` global como Mestre de mesa quando o dado for de mesa.
- [x] Atualizar OpenAPI.

### Contrato disponibilizado ao frontend

- Endpoints: `GET /api/v1/campaigns/admin/:campaignId/operations`.
- Metodo HTTP: `GET`.
- Autenticacao necessaria: bearer JWT; `ADMIN` global.
- Entrada principal: `campaignId`.
- Saida principal: campanha, mesa, agregados de participantes, consentimentos, personagens, sugestoes de IA, pesquisa final e eventos por chave.
- Estados e erros esperados: acesso negado, campanha inexistente, `403`, `404`.
- Contrato: complementado.

### Criterios de aprovacao

- Painel retorna contagens do funil MVP sem consultas manuais ao banco.
- Dados de campanhas/mesas nao autorizadas nao aparecem.
- Conteudo secreto e respostas sensiveis nao sao expostos indevidamente.
- Consultas paginadas usam limite e cursor quando listarem registros.
- OpenAPI descreve filtros e saidas principais.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- BI externo.
- Dashboards frontend.
- Metricas de combate, sessoes ou rolagens.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-10 — Preparacao tecnica da API para o piloto

**Camada:** Infraestrutura  
**Prioridade:** P1  
**Status atual:** Concluida  
**Depende de:** BRA-BE-09  
**Desbloqueia:** BRA-BE-11 e contratos do frontend

### Objetivo

Deixar contratos, configuracao e verificacoes tecnicas do backend prontos para o piloto.

### Evidencia atual

- `package.json` possui `typecheck`, `build`, `prisma:generate` e suites de validacao.
- `.github/workflows/ci.yml` executa typecheck, suites nao destrutivas, integracoes condicionais e build.
- `.env.example` contem `DATABASE_URL`, `DIRECT_URL`, JWT, CORS, OpenAI e e-mail.
- `src/server.ts` expoe `/health`, `/ready`, `/docs.json`, `/docs` e `/api/v1/meta/version`.
- OpenAPI em `src/docs/openapi.ts` reflete os contratos MVP criados nesta sequencia.
- `docs/pilot-api-validation.md` registra a ordem segura de validacao manual permitida.

### Implementacao necessaria

- [x] Atualizar OpenAPI para todos os contratos criados nas tasks anteriores.
- [x] Revisar `.env.example` para variaveis novas sem revelar valores.
- [x] Garantir que `/ready`, `/docs.json` e `/api/v1/meta/version` seguem validos para ambiente do piloto.
- [x] Documentar validacao manual permitida e ordem segura de verificacao.
- [x] Executar somente typecheck, build, lint se configurado, e consulta manual ao OpenAPI.

### Contrato disponibilizado ao frontend

- Endpoints envolvidos: todos os endpoints MVP documentados em OpenAPI.
- Metodo HTTP: conforme cada contrato.
- Autenticacao necessaria: documentada por rota.
- Entrada principal: schemas OpenAPI atualizados.
- Saida principal: schemas OpenAPI atualizados e erros padronizados.
- Estados e erros esperados: documentados por rota.
- Contrato: consolidado.

### Criterios de aprovacao

- OpenAPI reflete os endpoints MVP sem contradizer services atuais.
- `.env.example` contem variaveis necessarias sem valores sensiveis.
- Typecheck e build passam em ambiente seguro.
- Rotas de health, ready, docs e meta version continuam disponiveis.
- Documentacao tecnica lista as validacoes permitidas sem exigir testes automatizados novos.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Lint, se configurado.
- Build.
- Consulta manual ao OpenAPI.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- Criar ou executar testes automatizados novos.
- Deploy.
- Migração para Hostinger.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.

## BRA-BE-11 — Validacao pendente em Supabase exclusivo de testes

**Camada:** Infraestrutura  
**Prioridade:** P1  
**Status atual:** Bloqueada  
**Depende de:** BRA-BE-10  
**Desbloqueia:** confianca final do piloto

### Objetivo

Executar a validacao de integracao somente em Supabase/PostgreSQL descartavel e exclusivo de testes.

### Evidencia atual

- `docs/context-package-01.md`, `docs/table-package-02.md`, `docs/character-package-03.md` e `docs/ai-context-package-04.md` registram a exigencia de banco descartavel.
- `.github/workflows/ci.yml` executa integracoes apenas quando `TEST_DATABASE_URL` existe e `TEST_DATABASE_CONFIRMED_DISPOSABLE == 'true'`.
- `package.json` possui `test:context:integration`, `test:table-package02:integration` e `test:table-package03:integration`.
- A Frente 1 foi concluida com ressalva de ambiente.

### Implementacao necessaria

- [ ] Provisionar Supabase/PostgreSQL exclusivo, descartavel e confirmado para testes.
- [ ] Configurar `TEST_DATABASE_URL`, `TEST_DIRECT_URL` quando necessario e `TEST_DATABASE_CONFIRMED_DISPOSABLE=true`.
- [ ] Executar somente as suites de integracao ja existentes e comandos de validacao permitidos.
- [ ] Registrar resultado sem expor URLs, credenciais ou dados sensiveis.

### Contrato disponibilizado ao frontend

- Endpoints envolvidos: nenhum endpoint novo.
- Metodo HTTP: nao aplicavel.
- Autenticacao necessaria: nao aplicavel.
- Dados principais de entrada: variaveis de ambiente de teste seguras.
- Estrutura principal de saida: relatorio de validacao.
- Estados e erros esperados: ambiente ausente, banco nao descartavel, falha de migracao ou integracao.
- Contrato: nao aplicavel.

### Criterios de aprovacao

- Integracoes rodam somente contra banco descartavel confirmado.
- Nenhuma credencial ou URL sensivel e registrada em documentacao.
- Falhas, se houver, sao associadas a task especifica sem bloquear organizacao do backlog.
- CI permanece condicionado para nao executar integracao contra ambiente compartilhado.

### Validacao permitida

- Inspecao do codigo.
- Typecheck.
- Build.
- Verificacao manual de endpoints em ambiente seguro.

### Fora do escopo

- Executar integracao contra desenvolvimento, staging ou producao.
- Criar testes automatizados novos.
- Alterar funcionalidades do MVP.

### Instrucao de execucao futura

Implemente somente esta Task. Antes de alterar arquivos, confira novamente a evidencia atual e preserve os padroes existentes.
