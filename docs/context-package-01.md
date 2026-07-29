# Pacote 01 - Settings, episodios e contexto versionado

Este pacote implementa a espinha dorsal minima para registrar contexto de produto/jogo sem integrar IA, frontend definitivo, mesas novas ou ciclo de personagens.

## Modelo implementado

### Setting

Representa um cenario ou universo jogavel de alto nivel.

- `id`: identificador interno estavel.
- `stableKey`: identificador humano estavel, independente do titulo.
- `title`: nome exibivel e mutavel.
- `description`: descricao opcional.
- campos de auditoria: `createdById`, `updatedById`, `createdAt`, `updatedAt`.

### Episode

Representa um episodio dentro de um `Setting`.

- pertence a um `Setting`.
- usa `id` e `stableKey`; o titulo de trabalho nao e identidade irreversivel.
- campos de auditoria: `createdById`, `updatedById`, `createdAt`, `updatedAt`.

### ContextVersion

Representa uma versao logica de contexto.

- pertence a um `Setting`.
- pode pertencer a um `Episode`.
- possui `layer`, `version`, `status`, `origin`, `approvalNote`, `approvedById`, `publishedAt`, `archivedAt`.
- `DRAFT` pode receber unidades de contexto.
- `PUBLISHED` nao pode ser editada silenciosamente.
- `ARCHIVED` preserva historico e nao e removida fisicamente.

### ContextUnit

Representa uma unidade persistida de contexto dentro de uma versao.

- public e secret sao unidades separadas.
- `classification` e `visibility` sao enums separados.
- `content` nunca e compartilhado entre publico e segredo no mesmo campo indiferenciado.

## Classificacao versus visibilidade

Classificacao descreve a natureza da informacao:

- `OFFICIAL_CANON`
- `PUBLIC_CANON`
- `SECRET_CANON`
- `TABLE_CANON`
- `PRODUCT_DECISION`
- `RULE`
- `HYPOTHESIS`
- `PENDING_DECISION`
- `OUT_OF_MVP`

Visibilidade descreve quem pode acessar:

- `PUBLIC`
- `SPECTATOR`
- `AUTHENTICATED_TABLE_PLAYER`
- `SPECIFIC_CHARACTER`
- `TABLE_MASTER`
- `AUTHOR_ADMIN`

As duas dimensoes nao sao equivalentes. Um item pode ser canonico e ainda assim secreto. Um item pode ser hipotese e ter visibilidade restrita.

## Restricao temporaria de autorizacao

O backend ja separa `AccountRole.ADMIN` global de `TableMemberRole.MASTER` por mesa.

Como este pacote nao implementa o proximo pacote de Tables, members, invitations e roles de mesa, contexto secreto de Episodio 1 fica restrito a `AUTHOR_ADMIN`, aplicado hoje por rotas administrativas com `AccountRole.ADMIN`.

Um `MASTER` de mesa nao recebe automaticamente acesso a todo contexto secreto global. A liberacao segura por mesa depende do proximo pacote.

## Matriz de autorizacao atual

| Acao | Publico | Usuario comum | ADMIN |
|---|---:|---:|---:|
| Ler contexto publico publicado ativo | Sim | Sim | Sim |
| Criar Setting | Nao | Nao | Sim |
| Criar Episode | Nao | Nao | Sim |
| Criar versao de contexto | Nao | Nao | Sim |
| Adicionar unidade publica/secreta | Nao | Nao | Sim |
| Publicar versao | Nao | Nao | Sim |
| Arquivar versao | Nao | Nao | Sim |
| Listar versoes de gestao | Nao | Nao | Sim |
| Ler unidade secreta | Nao | Nao | Sim, via rota administrativa |

## Contratos da API

Rotas publicas:

- `GET /api/v1/context/settings/:settingStableKey/episodes/:episodeStableKey/active-public`
- `GET /api/v1/context/versions/:id/public`
- `GET /api/v1/context/units/:id/public`

Rotas administrativas:

- `POST /api/v1/context/admin/settings`
- `POST /api/v1/context/admin/episodes`
- `POST /api/v1/context/admin/versions`
- `POST /api/v1/context/admin/units`
- `POST /api/v1/context/admin/versions/:id/publish`
- `POST /api/v1/context/admin/versions/:id/archive`
- `GET /api/v1/context/admin/versions`
- `GET /api/v1/context/admin/versions/:id`

Codigos de erro estaveis principais:

- `SETTING_NOT_FOUND`
- `EPISODE_NOT_FOUND`
- `INVALID_SETTING_EPISODE_RELATIONSHIP`
- `DUPLICATED_STABLE_IDENTIFIER`
- `INVALID_CONTEXT_VERSION`
- `INVALID_CONTEXT_CLASSIFICATION`
- `INVALID_CONTEXT_VISIBILITY`
- `MISSING_CONTEXT_ORIGIN`
- `MISSING_APPROVAL_RESPONSIBILITY`
- `CONTEXT_VERSION_INCOMPLETE`
- `INVALID_CONTEXT_STATUS_TRANSITION`
- `CONTEXT_VERSION_IMMUTABLE`
- `CONTEXT_VERSION_NOT_FOUND`
- `NO_ACTIVE_CONTEXT_VERSION`
- `ADMIN_REQUIRED`

## Protecao contra spoilers

Leituras publicas usam filtro de consulta por `visibility` publica e `classification != SECRET_CANON`.

Isso evita carregar unidades secretas para depois filtrar em memoria. A resposta publica nao inclui contagem de unidades secretas, identificadores secretos, titulo secreto, origem secreta, aprovador secreto ou metadados de unidades protegidas.

Acesso direto por ID de unidade secreta retorna erro generico de contexto publico inexistente.

## Fixture de Episodio 1

O conteudo de validacao do Episodio 1 existe apenas nos testes automatizados de contexto. Ele nao foi inserido em seed, banco local, banco compartilhado ou producao.

As variaveis abertas ao Mestre permanecem nao selecionadas e nao sao persistidas como canon escolhido.

## Decisoes e conflitos

- Os documentos de produto esperados nao estavam no repositorio no momento da implementacao.
- A implementacao seguiu a decisao recente do Product Owner no prompt e a documentacao tecnica local.
- `TableWorld` nao foi reutilizado porque e especifico de mesa e mistura mundo da mesa com regras/criterios locais.
- `MissionDefinition` e gameplay existente nao foram usados como Episode para evitar criar um CMS generico ou confundir missao com pacote de contexto.

## Como testar

```bash
npm run prisma:generate
npm run test:context
npm test
npx tsc --noEmit
npx tsc
```
