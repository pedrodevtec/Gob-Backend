# Validacao manual da API do piloto

Use este roteiro para validar contratos do MVP sem criar ou executar testes automatizados novos.

## Ordem segura

1. Gerar Prisma Client quando houver mudanca de schema: `npm run prisma:generate`.
2. Executar typecheck: `npm run typecheck`.
3. Executar build: `npm run build`.
4. Consultar manualmente `/docs.json` e `/docs` em ambiente seguro.
5. Verificar manualmente, com dados descartaveis, os fluxos de campanha publica, Builder, personagem, IA, pesquisa e painel operacional.

## Rotas tecnicas

- `GET /health`
- `GET /ready`
- `GET /docs.json`
- `GET /docs`
- `GET /api/v1/meta/version`

## Restrições

- Nao executar suites automatizadas nesta etapa.
- Nao usar Supabase compartilhado para validacao de integracao.
- Nao registrar credenciais, URLs sensiveis, prompts completos, ficha, respostas narrativas ou conteudo secreto em documentos de resultado.
