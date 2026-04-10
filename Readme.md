# GOB Backend API

Backend em `Node.js + Express + TypeScript + Prisma` para jogo com suporte a:
- autenticacao JWT
- personagens
- inventario
- loja
- pedidos de pagamento
- recompensas idempotentes
- transacoes e auditoria basica

## Stack

- `express`
- `typescript`
- `prisma`
- `postgresql / supabase`
- `jsonwebtoken`
- `bcryptjs`

## Configuracao

Crie ou ajuste [`.env.local`](C:\Users\kausb\OneDrive\Área de Trabalho\Repositorio git\Gob-Backend\.env.local):

```env
DATABASE_URL="..."
DIRECT_URL="..."
JWT_SECRET="..."
PAYMENT_WEBHOOK_SECRET="change-me"
CORS_ORIGIN="*"
PORT="5000"
```

## Comandos

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

## Health

- `GET /health`
- `GET /ready`
- `GET /api/v1/meta/version`

## Autenticacao

### Registrar

- `POST /api/v1/auth/register`

Body:

```json
{
  "nome": "Pedro",
  "email": "pedro@email.com",
  "senha": "123456"
}
```

### Login

- `POST /api/v1/auth/login`

Body:

```json
{
  "email": "pedro@email.com",
  "senha": "123456"
}
```

### Usuario autenticado

- `GET /api/v1/auth/me`

Header:

```txt
Authorization: Bearer <token>
```

## Usuario

### Obter perfil

- `GET /api/v1/users/me/profile`

### Atualizar perfil

- `PATCH /api/v1/users/me/profile`

Body:

```json
{
  "nome": "Pedro Dev",
  "email": "pedrodev@email.com"
}
```

## Personagens

### Listar classes

- `GET /api/v1/characters/classes`

### Listar personagens

- `GET /api/v1/characters`

### Criar personagem

- `POST /api/v1/characters`

Body:

```json
{
  "name": "Arthas",
  "classId": "uuid-da-classe"
}
```

Se `classId` nao for enviado, o backend tenta usar a primeira classe cadastrada.

### Buscar personagem

- `GET /api/v1/characters/:id`

### Resumo do personagem

- `GET /api/v1/characters/:id/summary`

### Atualizar nome do personagem

- `PUT /api/v1/characters/:id`

Body:

```json
{
  "name": "Arthas Prime"
}
```

### Atualizar progresso

- `PATCH /api/v1/characters/:id/progress`

Body:

```json
{
  "xp": 150,
  "level": 2,
  "lastCheckpoint": "vila-inicial"
}
```

### Atualizar posicao

- `PATCH /api/v1/characters/:id/position`

Body:

```json
{
  "posX": 100.5,
  "posY": 50.2,
  "posZ": 12.8,
  "lastCheckpoint": "arena-central"
}
```

### Excluir personagem

- `DELETE /api/v1/characters/:id`

## Inventario

### Obter inventario

- `GET /api/v1/inventory/characters/:characterId`

### Obter carteira

- `GET /api/v1/inventory/characters/:characterId/wallet`

### Usar item

- `POST /api/v1/inventory/characters/:characterId/items/:itemId/use`

Body opcional:

```json
{
  "note": "uso manual pelo cliente"
}
```

Comportamento atual:
- consome 1 unidade do item
- registra transacao `ITEM_USED`
- aplica ganho automatico se `type` do item for `xp`, `xp_boost`, `coins` ou `coin_bag`

### Equipar item

- `POST /api/v1/inventory/characters/:characterId/equipments/:equipmentId/equip`

Comportamento:
- desequipa equipamento anterior do mesmo `type`
- equipa o item solicitado
- registra transacao `EQUIPMENT_EQUIPPED`

### Desequipar item

- `POST /api/v1/inventory/characters/:characterId/equipments/:equipmentId/unequip`

## Gameplay

### Jornada e catalogos

- `GET /api/v1/gameplay/journey`
- `GET /api/v1/gameplay/monsters`
- `GET /api/v1/gameplay/bounties`
- `GET /api/v1/gameplay/missions`
- `GET /api/v1/gameplay/trainings`
- `GET /api/v1/gameplay/npcs`

### Executar bounty hunt

- `POST /api/v1/gameplay/characters/:characterId/actions/bounty-hunt`

Body:

```json
{
  "bountyId": "uuid-da-bounty"
}
```

### Executar missao

- `POST /api/v1/gameplay/characters/:characterId/actions/missions`

Body:

```json
{
  "missionId": "uuid-da-missao"
}
```

### Executar treinamento

- `POST /api/v1/gameplay/characters/:characterId/actions/training`

Body:

```json
{
  "trainingId": "uuid-do-treinamento"
}
```

### Executar interacao com NPC

- `POST /api/v1/gameplay/characters/:characterId/actions/npc-interaction`

Body:

```json
{
  "npcId": "uuid-do-npc"
}
```

### Executar acao de mercado

- `POST /api/v1/gameplay/characters/:characterId/actions/market`

Body:

```json
{
  "action": "barter"
}
```

Ou:

```json
{
  "action": "scavenge"
}
```

## Admin

Todas as rotas abaixo exigem:
- `Authorization: Bearer <token>`
- usuario com `role = ADMIN`

### Criar monstro

- `POST /api/v1/admin/monsters`

Body:

```json
{
  "name": "Orc Berserker",
  "level": 7,
  "health": 140,
  "attack": 28,
  "defense": 12,
  "experience": 110
}
```

### Criar bounty

- `POST /api/v1/admin/bounties`

Body:

```json
{
  "title": "Caçada ao Orc Berserker",
  "description": "Elimine a ameaca que ronda a passagem norte.",
  "monsterId": "uuid-do-monstro",
  "recommendedLevel": 6,
  "difficulty": "HARD",
  "reward": 180,
  "rewardXp": 130,
  "rewardItemName": "Machado Quebrado",
  "rewardItemCategory": "monster_drop",
  "rewardItemType": "orc_axe_fragment",
  "rewardItemImg": "/assets/items/orc-axe-fragment.png",
  "rewardItemEffect": "Trofeu de guerra",
  "rewardItemValue": 75,
  "rewardItemQuantity": 1,
  "timeLimit": "2026-12-31T23:59:59.000Z",
  "status": "OPEN",
  "isActive": true
}
```

### Criar missao

- `POST /api/v1/admin/missions`

Body:

```json
{
  "title": "Cerco da Ponte Antiga",
  "description": "Proteja a travessia e elimine o comandante inimigo.",
  "difficulty": "MEDIUM",
  "recommendedLevel": 4,
  "enemyName": "Capitao Saqueador",
  "enemyLevel": 5,
  "enemyHealth": 95,
  "enemyAttack": 20,
  "enemyDefense": 10,
  "rewardXp": 85,
  "rewardCoins": 55,
  "rewardItemName": "Insignia da Ponte",
  "rewardItemCategory": "quest",
  "rewardItemType": "bridge_badge",
  "rewardItemImg": "/assets/items/bridge-badge.png",
  "rewardItemEffect": "Comprovante de missao",
  "rewardItemValue": 45,
  "rewardItemQuantity": 1,
  "isActive": true
}
```

### Criar treinamento

- `POST /api/v1/admin/trainings`

Body:

```json
{
  "name": "Treino Avancado de Resistencia",
  "description": "Sessao focada em suportar combates prolongados.",
  "trainingType": "endurance",
  "xpReward": 42,
  "coinsReward": 8,
  "cooldownSeconds": 7200,
  "isActive": true
}
```

### Criar NPC

- `POST /api/v1/admin/npcs`

Body:

```json
{
  "name": "Capitao Darius",
  "role": "scout",
  "interactionType": "scout",
  "description": "Veterano que fornece reconhecimento tatico.",
  "dialogue": "A trilha do leste esta livre, mas nao por muito tempo.",
  "xpReward": 20,
  "coinsReward": 12,
  "rewardItemName": "Mapa Rasgado",
  "rewardItemCategory": "npc_reward",
  "rewardItemType": "scout_map",
  "rewardItemImg": "/assets/items/scout-map.png",
  "rewardItemEffect": "Indica uma rota segura",
  "rewardItemValue": 18,
  "rewardItemQuantity": 1,
  "isActive": true
}
```

### Atualizar conteudo

- `PATCH /api/v1/admin/monsters/:id`
- `PATCH /api/v1/admin/bounties/:id`
- `PATCH /api/v1/admin/missions/:id`
- `PATCH /api/v1/admin/trainings/:id`
- `PATCH /api/v1/admin/npcs/:id`

Exemplo de patch:

```json
{
  "isActive": false
}
```

## Loja

### Catalogo

- `GET /api/v1/shop/catalog`

Retorna produtos persistidos na tabela `ShopProduct`.

### Compra com moeda do jogo

- `POST /api/v1/shop/purchases`

Body:

```json
{
  "characterId": "uuid-do-personagem",
  "productId": "uuid-ou-slug-do-produto",
  "quantity": 1
}
```

Regras:
- usa `coins` do inventario
- bloqueia compra de produto do tipo `COINS`
- entrega item/equipamento em transacao

### Criar pedido de pagamento externo

- `POST /api/v1/shop/payment-orders`

Body:

```json
{
  "characterId": "uuid-do-personagem",
  "productId": "uuid-ou-slug-do-produto",
  "quantity": 1,
  "provider": "manual"
}
```

### Listar pedidos do usuario

- `GET /api/v1/shop/payment-orders`

### Webhook de pagamento

- `POST /api/v1/shop/webhooks/payments`

Header:

```txt
x-webhook-secret: <PAYMENT_WEBHOOK_SECRET>
```

Body:

```json
{
  "orderId": "uuid-do-pedido",
  "providerPaymentId": "pay_123",
  "status": "PAID"
}
```

Ou:

```json
{
  "providerReference": "order_xxx",
  "status": "FAILED",
  "failureReason": "payment_denied"
}
```

Comportamento:
- valida segredo do webhook
- processa pedido de forma idempotente
- credita coins ou entrega produto
- registra transacao

## Recompensas

### Resgatar recompensa

- `POST /api/v1/rewards/claim`

Body:

```json
{
  "characterId": "uuid-do-personagem",
  "claimKey": "match-123-victory",
  "type": "XP",
  "value": 250,
  "metadata": "ranked_match"
}
```

Tipos aceitos:
- `XP`
- `COINS`

Regras:
- `claimKey` e unica
- evita reward duplicada
- registra `RewardClaim`
- registra transacao financeira/logica

### Listar rewards resgatadas

- `GET /api/v1/rewards/characters/:characterId`

## Transacoes

### Historico por personagem

- `GET /api/v1/transactions/characters/:characterId`

## Seeds atuais

O seed cria:
- classes: `Warrior`, `Mage`, `Rogue`
- monstros: `Slime`, `Goblin Scout`, `Wolf Alpha`
- bounties iniciais para esses monstros
- missoes iniciais
- treinamentos iniciais
- NPCs iniciais
- produtos:
  - `small-health-potion`
  - `bronze-sword`
  - `coin-pack-1000`

Se definir `SEED_ADMIN_EMAIL` no ambiente e esse usuario ja existir, o seed promove esse usuario para `ADMIN`.

## Observacoes importantes

- Todas as rotas protegidas exigem `Authorization: Bearer <token>`
- O backend usa validacao de payload e tratamento global de erro
- O fluxo de pagamento ainda esta desacoplado do gateway; o endpoint de webhook aceita confirmacao manual/integrada
- Para producao, ajuste `CORS_ORIGIN` e `PAYMENT_WEBHOOK_SECRET`
