# Character Builder pilot-v1

`pilot-v1` e a configuracao oficial aprovada pelo Product Owner para o piloto do Guardian of Bravantus.

## Contrato backend

- `GET /api/v1/builder/configs/active`
- `GET /api/v1/builder/configs/pilot-v1`

As rotas sao publicas e retornam somente configuracao permitida ao jogador. Antes de responder, o backend bloqueia marcadores sensiveis como `SECRET_CANON`, `TABLE_MASTER`, `AUTHOR_ADMIN` e marcador operacional de segredo.

## Fonte de verdade

A configuracao vive no backend em `src/Modules/builder/builder.config.ts`.

O frontend deve consumir a resposta da API e nao duplicar catalogos, perguntas, limites ou regras.

## Conteudo incluido

- versao `pilot-v1`;
- status `APPROVED`;
- catalogo de arquetipos;
- atributos e limites do piloto;
- recursos derivados que serao calculados pelo backend;
- treinamentos e bonus;
- sugestoes abertas de Traits e vinculos;
- slots e regras de equipamento;
- perguntas obrigatorias do Episodio 1 com `questionKey` e versao;
- limites de IA assistiva do jogador.

## Fora do escopo desta configuracao

- combate;
- rolagens;
- conducao de sessoes;
- Cronica da Mesa;
- pesquisa do Mestre;
- canonizacao automatica de sugestoes de IA.

## Validacao permitida

- inspecao do codigo;
- typecheck;
- build;
- consulta manual ao OpenAPI;
- verificacao manual dos endpoints em ambiente seguro.
