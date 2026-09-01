# Contraparte backend — sessão do Piloto (issue #16)

Status: **aprovado e implementado no backend pela issue #17**. A implementação
automatizada não substitui a comprovação E2E com frontend e banco do ambiente do Piloto.
Responsáveis pela aprovação: Product Owner e responsáveis pelos dois repositórios.

## Fontes e escopo

- [Issue backend #16](https://github.com/pedrodevtec/Gob-Backend/issues/16).
- [Contrato frontend mesclado na PR #31](https://github.com/pedrodevtec/GOB-Frontend/pull/31).
- Base frontend: commit `e2b84d988adecbd48f8fa553cd3372743e1a59f1`,
  `_bmad-output/planning-artifacts/contracts/auth-session.openapi.yaml` e ADR-001.
- Base backend inspecionada: `662121451d123ead0f92eca0d42272ef0d03fdb1`.

O contrato backend é exportado por `src/docs/openapi.ts` como
`openApiSessionContractDocument`. Ele compõe os endpoints existentes com os DTOs
e operações implementados de `src/docs/auth-session.contract.ts`. Os nomes dos schemas
recebem prefixo `AuthSession` para não substituir os schemas legados; o payload
mantém os campos do contrato compartilhado. Rotas `/api/auth/*` são do Next BFF,
nunca rotas Express.

`openApiDocument`, usado por `/docs.json` e `/docs`, agora incorpora as operações
implementadas. `openApiSessionContractDocument` permanece como alias compatível
para o ferramental de revisão criado na #16. A exportação é serializável sem
carregar app, banco, variáveis de ambiente ou servidor:

```sh
node -r ts-node/register -e 'console.log(JSON.stringify(require("./src/docs/openapi").openApiSessionContractDocument, null, 2))'
npm run test:auth-contract
```

O backend implementa handlers, middleware e persistência. Cookies continuam sob
responsabilidade do BFF frontend na issue #32.

## Comportamento alvo

| Operação | Entrada | Sucesso | Falhas previstas no contrato conjunto |
| --- | --- | --- | --- |
| `POST /api/v1/auth/login` | `email`, `senha` | `success`, tokens, expirações, `user`, `session` | 401, 403, 429 |
| `POST /api/v1/auth/refresh` | `refreshToken` | Mesmo DTO de login, com sucessor | 401, 409, 429 |
| `POST /api/v1/auth/logout` | `refreshToken` | `success`, `outcome` | 429 |
| `GET /api/v1/auth/me` | Bearer access token | `success`, `user`, `session` | 401, 403 |

O DTO de login não contém o alias legado `token` nem a mensagem extra hoje
adicionada pelo controller. #17 deverá tratar a compatibilidade conscientemente,
sem supor que o cliente atual aceita o novo payload. Login recebe `senha` no
backend; o BFF traduz o `password` enviado pelo browser.

Todos os resultados de autenticação, inclusive erros, usam `Cache-Control: no-store`.
Os códigos de erro mantêm o envelope `{success:false,error:{code,message,requestId?}}`.
Falhas genéricas de transporte/validação continuam exigindo tratamento defensivo;
a lista acima não autoriza interpretar resposta inesperada como sucesso.

## Persistência, expiração e revogação

- JWT de acesso: 600 segundos; validar assinatura, algoritmo permitido, `iss`,
  `aud`, `sub`, `sid`, `iat`, `exp` e `jti`. O banco é a autoridade de sessão e papel.
- Refresh opaco aleatório: 604800 segundos a partir da emissão, renovados na
  rotação. É prazo **deslizante**, não um limite absoluto da família. Expirado não
  pode ser renovado. Um limite absoluto adicional exigiria outra decisão.
- Persistir somente hash de refresh, proprietário, família, expiração, consumo e
  revogação. Manter predecessores identificáveis para detectar reuse e logout.
  Não persistir access tokens nem coletar IP/user-agent brutos neste escopo.
- Cada refresh gera sucessor na mesma família. Consumir o anterior e criar o
  sucessor numa transação, com comparação/lock no banco; mutex em memória não
  garante exclusão entre instâncias. Não retornar tokens antes do commit.
- Consumido não significa revogado: um access token de outra aba permanece válido
  até sua expiração, salvo revogação/expiração de sessão. A implementação precisa
  distinguir esses estados, mesmo se usar uma linha por rotação.
- Logout por qualquer refresh reconhecido, inclusive predecessor, revoga toda a
  família e seus access tokens. Token desconhecido ou família já inativa retorna
  `success:true,outcome:already_inactive`; primeira revogação retorna `revoked`.
  Não afirmar sucesso se a transação falhar.
- `local_only` permanece no schema conjunto por compatibilidade, mas é exclusivo
  da resposta BFF quando o backend não confirma revogação (HTTP 503 no BFF).
- Proposta conservadora para #17: remoção de membership ou mudança de papel
  global/da mesa revoga todas as sessões do usuário afetado na mesma transação.
  Isso pode exigir novo login também em outras campanhas; precisa de aprovação
  explícita na revisão. Novo login não restaura a membership removida.
- Toda chamada protegida verifica sessão ativa e papel atual. Uma sessão revogada
  retorna 401 mesmo com JWT ainda válido; sessão válida sem permissão retorna 403.
  Membership e capacidades são verificadas no recurso. `ADMIN` não implica `MASTER`.
- Revogar sessões na exclusão de conta e na alteração de senha, quando disponível.

## Concorrência: esclarecimento a aprovar com o frontend

Uma repetição do token consumido com idade **menor que 5 segundos** retorna
`409 REFRESH_ALREADY_ROTATED`, sem emitir segredo e sem revogar a família.
A partir de 5 segundos, revoga a família e retorna `401 REFRESH_TOKEN_REUSED`.
Uma família já revogada não pode voltar ao caminho de conflito ou sucesso.

A frase da ADR frontend “o BFF relê o cookie compartilhado” deve ser interpretada
como **uma nova requisição do browser**. A requisição BFF em andamento recebeu o
cookie anterior e não consegue observar um `Set-Cookie` entregue a outra aba.

Na #32: consolidar refresh na aba e coordenar abas; propagar 409 sem apagar ou
reescrever cookie. Depois da conclusão da rotação vencedora, o browser pode fazer
uma única nova tentativa BFF, que recebe o cookie atualizado. Sem sucessor
disponível, oferecer nova autenticação, sem loop ou repetição cega do token antigo.
Não compartilhar o refresh token por JavaScript. A implementação precisa testar
também a perda da resposta vencedora e logout concorrente para não ressuscitar
sessão/cache. Este esclarecimento deve ser refletido na ADR frontend ao executar #32.

| Situação | HTTP/código | Reação frontend |
| --- | --- | --- |
| Access expirado | 401 `TOKEN_EXPIRED` | Um refresh e uma repetição da chamada |
| Sessão revogada/expirada | 401 `SESSION_REVOKED` / `SESSION_EXPIRED` | Limpar estado privado; login com retorno interno |
| Refresh ausente/inválido | 401 `REFRESH_REQUIRED` / `INVALID_REFRESH_TOKEN` | Login, sem loop |
| Reutilização fora da janela | 401 `REFRESH_TOKEN_REUSED` | Família revogada; login |
| Rotação concorrente | 409 `REFRESH_ALREADY_ROTATED` | Nova requisição coordenada; não apagar cookie |
| Sem capability/e-mail não confirmado | 403 `FORBIDDEN` / `EMAIL_NOT_VERIFIED` | Exibir bloqueio; nunca renovar por 403 |
| Rate limit | 429 `RATE_LIMIT_EXCEEDED` | Respeitar limitação; sem retry imediato em loop |

## Migração e rollback

1. #16 foi aprovada pela PR #20. #17 implementa migration aditiva, índices,
   histórico de rotação, endpoints e um runner de integração PostgreSQL.
2. Executar migration e runner de integração em banco isolado antes do rollout;
   esta sessão não aplicou DDL em banco compartilhado.
3. Em #32: criar BFF com `HttpOnly; Secure; SameSite=Lax; Path=/`, sem `Domain` em produção,
   validação de Origin, access em memória e migração conjunta de store/bootstrap/
   Axios/middleware/logout. Remover credenciais persistidas no cliente.
4. Executar a matriz abaixo antes do convite externo. O OpenAPI oficial já expõe
   as operações implementadas para o consumidor frontend.
5. Rollback de aplicação deve manter revogações efetivas: não reativar validador
   de JWT legado que ignora sessão. Em falha, bloquear autenticação/convites e
   preservar tabelas/histórico até correção. O runbook registra aplicação e reversão.

## Matriz integrada acordada para implementação

Todos os cenários abaixo estão **NÃO EXECUTADOS**. Testes de contrato validam
documentação, não comprovam sessão segura. Registrar somente IDs técnicos,
papel da conta, status/código HTTP, estado persistido e rota final; nunca tokens,
senhas, hashes de refresh ou conteúdo privado.

| Cenário | Evidência exigida com backend e banco reais |
| --- | --- |
| Login confirmado / credenciais inválidas / e-mail pendente | 200/401/403; sessão somente no sucesso; JWT 600s e hash persistido |
| Bootstrap e access expirado | /refresh 200, uma repetição, retorno interno preservado |
| Dois refresh simultâneos em conexões distintas | Exatamente um sucessor persistido, um 200 e um 409 |
| Fronteira temporal 4999ms / 5000ms | Conflito sem revogação / reuse com revogação da família |
| Falha antes do commit | Nenhum predecessor consumido sem sucessor persistido |
| Duas abas / perda da resposta vencedora | Cookie não apagado pelo 409; retry limitado ou login recuperável |
| Refresh expirado / família revogada | 401, nenhum sucessor |
| Logout repetido e por predecessor | revoked/already_inactive; access de toda família rejeitado |
| Logout versus refresh concorrentes | Estado final revogado; nenhum sucessor utilizável |
| Remoção de membro / troca de papel | Revogação efetiva; novo login ainda sem permissão removida |
| Falta de permissão com sessão válida | 403; frontend não dispara refresh |
| Backend indisponível no logout | BFF 503 local_only, cookie/cache limpos, sem falsa confirmação remota |
| Cache, CSRF, segredo e retorno | no-store, Origin recusado, cookie HttpOnly, sem token persistido em JS, returnTo externo rejeitado |

## Checklist do gate

- [x] Payloads, HTTP, concorrência, logout de família e prazo aprovados na PR #20.
- [x] Persistência, endpoints, middleware, OpenAPI, migration e testes automatizados implementados em #17.
- [ ] Migration e runner de integração executados em PostgreSQL isolado.
- [ ] BFF, cookie HttpOnly e coordenação entre abas implementados no frontend #32.
- [ ] Matriz E2E comprovada com frontend, backend e banco reais.

Próxima sequência: frontend #32 → backend #19/frontend #36 →
backend #18/frontend #35, respeitando a publicação dos contratos oficiais.
