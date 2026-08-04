# Backend Package 04 - Safe AI Context

Pacote 04 centraliza a montagem de contexto para usos futuros de IA do jogador.
Ele nao executa chamada a provedor e nao altera personagem.

## Casos suportados

- `PLAYER_CHARACTER_CREATION`
- `PLAYER_CHARACTER_VALIDATION`

## Politica

`AiContextService.buildPlayerCharacterContext` exige:

- usuario autenticado informado pela camada de aplicacao;
- membership ativa `PLAYER` na mesa;
- `ContextVersion` publicada e fixada na propria `Table`;
- personagem pertencente ao mesmo usuario e a mesma mesa quando `characterId` e enviado;
- personagem obrigatorio em `PLAYER_CHARACTER_VALIDATION`.

O contexto inclui somente:

- unidades `PUBLIC`;
- unidades `AUTHENTICATED_TABLE_PLAYER`;
- o proprio personagem do jogador;
- as proprias respostas de episodio do personagem.

O contexto exclui:

- `SECRET_CANON`;
- `TABLE_MASTER`;
- `AUTHOR_ADMIN`;
- `SPECIFIC_CHARACTER`;
- personagens de outros jogadores;
- respostas de outros jogadores;
- outras mesas;
- outras `ContextVersion`, ainda que publicadas.

## Defesa adicional

Antes de retornar o DTO, o service bloqueia marcadores sensiveis conhecidos como
`gm_secret`, `SECRET_CANON`, `TABLE_MASTER` e `AUTHOR_ADMIN`. Isso nao substitui
a classificacao correta do conteudo, mas evita que um erro editorial simples
saia diretamente para prompts.

## Testes

`npm run test:ai-context` exercita a politica com banco falso isolado. As suites
de integracao de Context, Table e Character continuam condicionadas a um
PostgreSQL/Supabase de teste explicitamente descartavel.
