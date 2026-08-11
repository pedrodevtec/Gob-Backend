# Backend Package 03 - Character lifecycle

## Escopo implementado

O Pacote 03 adiciona a base minima para personagens criados por jogadores dentro de uma mesa:

- jogador ativo cria rascunho proprio;
- rascunho pode ser salvo incompleto;
- submissao exige os campos obrigatorios suportados pelo pacote;
- mestre da mesma mesa solicita alteracoes com motivo;
- jogador edita apos `CHANGES_REQUESTED` e reenvia;
- mestre aprova a revisao submetida;
- cada submissao preserva um snapshot imutavel da ficha e das respostas do episodio;
- historico humano de revisao fica preservado;
- acesso direto por id aplica mesa, dono e papel escopado.

Nao foram implementados AI, sessoes, rolagens, Chronicle, atribuicao de Erya, aprovacao automatica, frontend, upload de avatar ou preparacao de episodio.

## Modelo de dominio

O modelo existente `Character` foi reaproveitado para preservar compatibilidade com gameplay legado. Como `classId` ja era obrigatorio, a criacao de rascunho do Pacote 03 associa uma classe base legada existente apenas como requisito tecnico de integridade referencial. Isso nao cria catalogo novo de arquétipos nem regras novas de classe.

Campos adicionados a `Character`:

- identidade e narrativa: `concept`, `origin`, `appearance`, `desire`, `fear`, `promiseOrGuilt`, `reasonToActWithGroup`;
- Marca: `markLocation`, `markAppearance`, `markReaction`, `markAttitude`;
- regras de ficha como dados validados: `archetypeKey`, `attributes`, `trainings`, `positiveTrait`, `negativeTrait`, `narrativeBond`, `personalHistory`, `initialEquipment`;
- ciclo de vida: `sheetStatus`, `sheetRevision`, `submittedRevision`, `submittedAt`, `approvedAt`, `approvedById`, `updatedAt`.

`CharacterEpisodeAnswer` persiste respostas por pergunta de episodio com `questionKey`, `promptSnapshot` e `answer`. Existe unicidade por `(characterId, questionKey)`.

`CharacterSubmissionSnapshot` preserva cada envio do jogador com `sheetRevision`, `submittedById`, `submittedAt`, `builderConfigVersion`, `contextVersionId`, `characterSnapshot` e `episodeAnswersSnapshot`. Ressubmissoes criam novos snapshots e nao sobrescrevem os anteriores. A aprovacao marca o snapshot da revisao aprovada.

`CharacterReviewEvent` preserva auditoria com `reviewerUserId`, `action`, `reason`, `characterRevisionReviewed` e `createdAt`.

## Lifecycle

Estados suportados:

- `DRAFT`;
- `SUBMITTED`;
- `CHANGES_REQUESTED`;
- `APPROVED`.

Transicoes implementadas:

- criacao -> `DRAFT`;
- `DRAFT` -> `SUBMITTED`;
- `SUBMITTED` -> `CHANGES_REQUESTED`;
- `CHANGES_REQUESTED` -> `SUBMITTED`;
- `SUBMITTED` -> `APPROVED`.

Todas as demais transicoes sao rejeitadas pelo service. Personagem `APPROVED` nao pode ser editado neste pacote.

## Regras de propriedade

Somente um membro ativo `PLAYER` da mesa cria e edita personagem proprio. O servidor ignora ownership fornecido pelo cliente: campos como `ownerUserId`, `userId`, `tableId`, status, revisao e dados de aprovacao sao bloqueados no validador.

Um `MASTER` ativo da mesma mesa pode ler personagem submetido ou aprovado e revisar personagem `SUBMITTED`. `MASTER` nao edita a ficha do jogador e nao revisa personagem proprio.

`ADMIN` global sozinho nao recebe permissao de `TABLE_MASTER`.

## Validacoes da ficha

Rascunhos podem ser incompletos. Submissao exige:

- todos os campos narrativos e de Marca suportados;
- `archetypeKey`;
- exatamente seis atributos;
- exatamente tres treinos sem duplicidade;
- trait positivo e negativo;
- vinculo narrativo;
- historia pessoal;
- equipamento inicial;
- ao menos uma resposta de episodio.

Como nao ha catalogo autoritativo de arquétipos, atributos, treinos ou equipamentos no repositório, o pacote valida forma, unicidade, tipos numericos e chaves estaveis. Validacao contra catalogo aprovado fica pendente de seed/configuracao de produto.

Totais derivados enviados pelo cliente sao rejeitados quando aparecem em objetos estruturados. Nenhuma formula derivada foi implementada porque nao foi localizado documento autoritativo versionado no repositório.

## Respostas de episodio

As respostas usam `questionKey` estavel e `promptSnapshot`. O modelo permite configurar perguntas por episodio no futuro sem gravar lore de Erya ou do Episodio 1 diretamente em `Character`.

A submissao exige as quatro perguntas oficiais do Builder `pilot-v1`: `relationship_with_erya`, `protection_in_bravantus`, `past_connection_to_mandukuru` e `fear_of_guardian_souls`.

## Privacidade e spoilers

Endpoints de personagem nao retornam Context. A criacao de personagem depende apenas de membership da mesa e nao expõe camadas `TABLE_MASTER`, `SPECIFIC_CHARACTER`, `SPECTATOR` ou `AUTHOR_ADMIN`.

Regras minimas:

- `DRAFT`: dono le e edita; mestre nao le via endpoint de detalhe;
- `CHANGES_REQUESTED`: dono le e edita; mestre da mesa pode ler historico e ficha;
- `SUBMITTED`: dono le; mestre da mesa revisa;
- `APPROVED`: dono e mestre da mesa leem;
- outros jogadores nao recebem a ficha privada;
- usuario fora da mesa, membro removido e anonimo nao recebem dados.

## Endpoints

- `POST /api/v1/tables/:tableId/characters`;
- `GET /api/v1/tables/:tableId/characters/me`;
- `GET /api/v1/tables/:tableId/characters/:characterId`;
- `PATCH /api/v1/tables/:tableId/characters/:characterId`;
- `PATCH /api/v1/tables/:tableId/characters/:characterId/episode-answers`;
- `POST /api/v1/tables/:tableId/characters/:characterId/submit`;
- `GET /api/v1/tables/:tableId/character-reviews`;
- `GET /api/v1/tables/:tableId/characters/:characterId/reviews`;
- `POST /api/v1/tables/:tableId/characters/:characterId/request-changes`;
- `POST /api/v1/tables/:tableId/characters/:characterId/approve`.

`GET /api/v1/tables/:tableId/characters/me` retorna a ficha completa do proprio jogador, respostas do Episodio 1, recursos derivados, status, revisoes, editabilidade, proxima acao, feedback do Mestre e referencias da submissao mais recente e da submissao aprovada, quando existirem.

## Persistencia e rollback

A migration `20260730130000_add_character_package_03` e aditiva:

- cria enums `CharacterSheetStatus` e `CharacterReviewAction`;
- adiciona campos nullable e defaults ao `Character`;
- cria `CharacterEpisodeAnswer`;
- cria `CharacterReviewEvent`;
- adiciona indices, FKs e unicidade.

Rollback manual deve remover primeiro tabelas dependentes e FKs, depois colunas e enums. A migration nao inventa donos, mesas ou relacionamentos para dados legados.

## Testes

Comandos principais:

- `npm run prisma:generate`;
- `npx tsc --noEmit`;
- `npm run test:context`;
- `npm run test:context:integration`;
- `npm run test:table-overview`;
- `npm run test:auth`;
- `npm run test:table-package02:integration`;
- `npm run test:table-package03:integration`;
- `npm test`;
- `npx tsc`.

As integracoes reais exigem banco PostgreSQL descartavel explicitamente confirmado:

- `NODE_ENV=test`;
- `TEST_DATABASE_CONFIRMED_DISPOSABLE=true`;
- `TEST_DATABASE_URL`;
- `TEST_DIRECT_URL` quando o Prisma precisar;
- `DATABASE_URL` e `DIRECT_URL` apenas no processo de execucao.
