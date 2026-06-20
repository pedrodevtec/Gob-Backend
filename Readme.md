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

### Manutencao de dados

Para resetar dados de personagens e/ou remover missoes criadas manualmente:

```bash
npm run db:reset-game-state -- --reset-characters
npm run db:reset-game-state -- --delete-admin-missions
npm run db:reset-game-state -- --reset-characters --delete-admin-missions
```

Por seguranca, o script roda em `dry-run` por padrao. Para apagar de fato:

```bash
npm run db:reset-game-state -- --reset-characters --delete-admin-missions --confirm
```

Observacoes:
- `--reset-characters` limpa `Character`, `Inventory`, `Item`, `Equipment`, `Transaction`, `CharacterActionLog`, `RewardClaim` e `PaymentOrder`
- `--delete-admin-missions` remove apenas missoes com titulo fora da lista seedada
- `--delete-all-missions` remove todas as missoes da tabela `MissionDefinition`
- como `MissionDefinition` nao possui campo `createdBy`, a separacao entre seed e admin hoje e feita por titulo das missoes seedadas

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

### Rankings

- `GET /api/v1/characters/rankings`

Query opcional:

```txt
?limit=10
```

Retorna tres rankings em uma chamada:
- `rankings.highestLevel`
- `rankings.mostMissions`
- `rankings.mostBounties`

Regras:
- `highestLevel` ordena por `level desc`, depois `xp desc`
- `mostMissions` considera `CharacterActionLog` com `actionType = MISSION` e `outcome = WIN`
- `mostBounties` considera `CharacterActionLog` com `actionType = BOUNTY_HUNT` e `outcome = WIN`
- `limit` aceita de `1` a `50`

Exemplo resumido:

```json
{
  "rankings": {
    "limit": 10,
    "generatedAt": "2026-04-11T15:00:00.000Z",
    "rankings": {
      "highestLevel": [
        {
          "position": 1,
          "score": 12,
          "metric": "LEVEL",
          "character": {
            "id": "character-id",
            "name": "Arthas",
            "level": 12,
            "xp": 1180,
            "currentHealth": 220,
            "status": "READY",
            "coins": 540,
            "class": {
              "id": "class-id",
              "name": "Warrior",
              "modifier": "STR"
            }
          }
        }
      ],
      "mostMissions": [],
      "mostBounties": []
    }
  }
}
```

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

### Perfil publico do personagem

- `GET /api/v1/characters/:id/public-profile`

Uso esperado:
- abrir detalhes de um personagem vindo do leaderboard
- nao exige ownership do personagem, apenas autenticacao

Retorna:
- progresso base do personagem
- classe
- `stats` derivados atuais
- equipamentos equipados
- contadores de `missionsCompleted` e `bountiesCompleted`

Exemplo resumido:

```json
{
  "profile": {
    "id": "character-id",
    "name": "Arthas",
    "level": 12,
    "xp": 1180,
    "currentHealth": 220,
    "status": "READY",
    "class": {
      "id": "class-id",
      "name": "Warrior",
      "modifier": "STR",
      "description": "Especialista em combate corpo a corpo e alta resistencia.",
      "passive": "Defesa reforcada em combates prolongados."
    },
    "stats": {
      "attack": 58,
      "defense": 37,
      "maxHealth": 314,
      "critChance": 0.08
    },
    "progression": {
      "missionsCompleted": 14,
      "bountiesCompleted": 8
    },
    "equipment": {
      "totalEquipped": 3,
      "equipped": [
        {
          "id": "equipment-id",
          "name": "Lamina do Campeao",
          "category": "weapon",
          "type": "weapon",
          "img": "/assets/items/tier-4-blade.png",
          "effect": "+15 ATK",
          "equippedAt": "2026-04-11T15:10:00.000Z"
        }
      ]
    }
  }
}
```

### Resumo do personagem

- `GET /api/v1/characters/:id/summary`

Campos importantes para o front:
- `level`
- `xp`
- `currentHealth`
- `status` com valores `READY`, `WOUNDED` ou `DEFEATED`
- `inventory.coins`
- `recentTransactions`
- `recentGameplayActions`

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

Regras atuais do gameplay para o front:
- combate usa o `currentHealth` persistido do personagem como vida inicial
- ao fim de combate, o backend atualiza `characterState.currentHealth` e `characterState.status`
- se o personagem chegar a `0 HP`, ele fica `DEFEATED` e nao pode iniciar novo combate
- NPC com `interactionType = healer` restaura HP maximo e volta o status para `READY`
- treino respeita `cooldownSeconds` por personagem
- missao possui janela de repeticao por personagem e retorna `availability.nextAvailableAt`
- bounty so pode ser concluida uma vez por personagem enquanto a mesma bounty estiver ativa
- market e NPC possuem cooldown por personagem e retornam `availability.nextAvailableAt`

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

Retorno relevante para UI:
- `result.combat.victory`
- `result.combat.rounds`
- `result.rewards`
- `result.progression`
- `result.inventory`
- `result.characterState`

Erros esperados:
- `409 CHARACTER_DEFEATED`
- `409 BOUNTY_ALREADY_COMPLETED`
- `409 BOUNTY_EXPIRED`

### Executar missao

- `POST /api/v1/gameplay/characters/:characterId/actions/missions`

Body:

```json
{
  "missionId": "uuid-da-missao"
}
```

Retorno relevante para UI:
- `result.combat`
- `result.rewards`
- `result.progression`
- `result.characterState`
- `result.availability.nextAvailableAt`

Erro esperado:
- `409 ACTION_ON_COOLDOWN`

### Executar treinamento

- `POST /api/v1/gameplay/characters/:characterId/actions/training`

Body:

```json
{
  "trainingId": "uuid-do-treinamento"
}
```

Retorno relevante para UI:
- `result.rewards`
- `result.progression`
- `result.characterState`
- `result.availability.nextAvailableAt`

Erro esperado:
- `409 ACTION_ON_COOLDOWN`

### Executar interacao com NPC

- `POST /api/v1/gameplay/characters/:characterId/actions/npc-interaction`

Body:

```json
{
  "npcId": "uuid-do-npc"
}
```

Para NPC com `interactionType = "buffer"`:

```json
{
  "npcId": "uuid-do-npc-buffer",
  "buffPercent": 4
}
```

Retorno relevante para UI:
- `result.note`
- `result.rewards`
- `result.buff`
- `result.characterState`
- `result.availability.nextAvailableAt`

Observacao:
- se `interactionType` for `healer`, o backend devolve HP cheio em `characterState`
- se `interactionType` for `buffer`, o backend aceita `buffPercent` com `2`, `4` ou `6`, cobra coins e aplica buff temporario

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

Retorno relevante para UI:
- `result.rewards`
- `result.inventory`
- `result.characterState`
- `result.availability.nextAvailableAt`

Erro esperado:
- `409 ACTION_ON_COOLDOWN`

### Formato de retorno de gameplay

As acoes de gameplay retornam em `result` um formato proximo de:

```json
{
  "action": "BOUNTY_HUNT",
  "enemy": "Slime",
  "combat": {
    "victory": true,
    "characterHealthRemaining": 84,
    "enemyHealthRemaining": 0,
    "stats": {
      "attack": 19,
      "defense": 12,
      "maxHealth": 106,
      "critChance": 0.08
    },
    "rounds": [
      {
        "round": 1,
        "actor": "character",
        "damage": 18,
        "remainingEnemyHealth": 17
      },
      {
        "round": 1,
        "actor": "monster",
        "damage": 7,
        "remainingCharacterHealth": 99
      }
    ]
  },
  "rewards": {
    "xp": 20,
    "coins": 25,
    "item": null
  },
  "progression": {
    "previousXp": 0,
    "currentXp": 20,
    "previousLevel": 1,
    "currentLevel": 1,
    "levelUps": 0
  },
  "inventory": {
    "id": "inventory-id",
    "coins": 25
  },
  "characterState": {
    "currentHealth": 84,
    "maxHealth": 106,
    "status": "WOUNDED",
    "lastCombatAt": "2026-04-11T12:00:00.000Z",
    "lastRecoveredAt": null
  },
  "availability": {
    "actionType": "BOUNTY_HUNT",
    "nextAvailableAt": null
  }
}
```

## Mesas RPG assincronas

Todas as rotas abaixo exigem:
- `Authorization: Bearer <token>`
- usuario participante da mesa para leitura/interacao
- `MASTER` para criacao/edicao de mundo, traits, missoes, reviews e eventos manuais de timeline

### Criar mesa

- `POST /api/v1/tables`

Body:

```json
{
  "name": "Cronicas de Eldoria"
}
```

Comportamento:
- cria uma mesa com `joinCode` unico
- adiciona o criador como membro `MASTER`
- limite de jogadores `PLAYER`: 8
- cria evento automatico na timeline

### Listar mesas do usuario

- `GET /api/v1/tables`

### Buscar mesa

- `GET /api/v1/tables/:id`

### Entrar em mesa

- `POST /api/v1/tables/join`

Body:

```json
{
  "joinCode": "AB12CD"
}
```

Regras:
- usuario nao pode entrar duas vezes na mesma mesa
- mesa aceita ate 8 membros com role `PLAYER`

### Mundo da mesa

- `GET /api/v1/tables/:tableId/world`
- `PUT /api/v1/tables/:tableId/world`

Body do `PUT`:

```json
{
  "campaignTitle": "A Queda da Lua Verde",
  "summary": "Um grupo investiga uma praga arcana que avanca pelo reino.",
  "tone": "dark fantasy",
  "rules": {
    "postingFrequency": "3 vezes por semana",
    "dicePolicy": "mestre resolve rolagens importantes"
  },
  "characterCreationCriteria": {
    "startingLevel": 1,
    "allowedClasses": ["Warrior", "Mage", "Rogue"]
  }
}
```

Regras:
- qualquer membro visualiza
- somente `MASTER` cria ou atualiza

### Personagens da mesa

- `POST /api/v1/tables/:tableId/characters`
- `GET /api/v1/tables/:tableId/characters`
- `PATCH /api/v1/tables/:tableId/characters/:characterId/review`

Body para criar personagem:

```json
{
  "name": "Lyra",
  "classId": "uuid-da-classe"
}
```

Comportamento:
- reutiliza a criacao normal de personagem
- vincula o personagem a `tableId`
- cria review com status `PENDING`

Body para review:

```json
{
  "status": "APPROVED",
  "masterFeedback": "Aprovada para iniciar na Vila Cinzenta."
}
```

Status aceitos:
- `APPROVED`
- `REJECTED`
- `NEEDS_CHANGES`

Ao aprovar um personagem, o backend cria evento automatico `CHARACTER_APPROVED` na timeline. Falha nesse evento e apenas logada e nao cancela a aprovacao.

### Traits de personagem

- `GET /api/v1/tables/:tableId/characters/:characterId/traits`
- `POST /api/v1/tables/:tableId/characters/:characterId/traits`
- `DELETE /api/v1/tables/:tableId/characters/:characterId/traits/:traitId`

Body:

```json
{
  "type": "POSITIVE",
  "name": "Aliado da Guarda",
  "description": "Recebe ajuda de guardas locais em cidades do reino."
}
```

Tipos aceitos:
- `POSITIVE`
- `NEGATIVE`
- `NEUTRAL`

Regras:
- todos os membros podem listar
- somente `MASTER` cria ou remove
- `characterId` deve pertencer a mesma mesa

### Missoes da mesa

- `POST /api/v1/tables/:tableId/missions`
- `GET /api/v1/tables/:tableId/missions`
- `GET /api/v1/tables/:tableId/missions/:missionId`
- `PATCH /api/v1/tables/:tableId/missions/:missionId`

Body de criacao:

```json
{
  "title": "Investigar o Farol",
  "description": "Descubram por que o farol deixou de emitir luz.",
  "objective": "Enviar um plano de entrada e investigacao.",
  "isRequired": true,
  "dueDate": "2026-07-01T23:59:59.000Z"
}
```

Body de atualizacao:

```json
{
  "status": "COMPLETED",
  "objective": "Relatar o que foi encontrado no subsolo."
}
```

Status de missao:
- `ACTIVE`
- `COMPLETED`
- `ARCHIVED`

Regras:
- qualquer membro lista e visualiza
- somente `MASTER` cria ou atualiza
- ao criar missao, o backend cria evento automatico `MISSION_CREATED` na timeline

### Submissoes de missao

- `POST /api/v1/tables/:tableId/missions/:missionId/submissions`
- `GET /api/v1/tables/:tableId/missions/:missionId/submissions`
- `PATCH /api/v1/tables/:tableId/missions/:missionId/submissions/:submissionId/review`

Body para enviar resposta:

```json
{
  "characterId": "uuid-do-personagem-aprovado",
  "content": "Lyra observa o farol a distancia e procura marcas recentes perto da porta."
}
```

Body para review:

```json
{
  "status": "APPROVED",
  "masterNote": "A abordagem revelou pegadas recentes e uma chave quebrada."
}
```

Status de submissao:
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `NEEDS_CHANGES`

Regras:
- jogador so envia resposta com personagem aprovado na mesa
- `missionId` e `characterId` precisam pertencer a mesma mesa
- `MASTER` ve todas as submissoes
- `PLAYER` ve apenas as proprias
- ao aprovar submissao, o backend cria evento automatico `MISSION_APPROVED` na timeline

### Timeline da campanha

- `GET /api/v1/tables/:tableId/timeline`
- `POST /api/v1/tables/:tableId/timeline`

Body para evento manual:

```json
{
  "characterId": "uuid-opcional-do-personagem",
  "title": "Resumo da sessao 1",
  "description": "O grupo chegou a Vila Cinzenta e encontrou o primeiro sinal da praga.",
  "type": "SESSION_SUMMARY"
}
```

Tipos aceitos:
- `STORY`
- `MISSION_CREATED`
- `MISSION_APPROVED`
- `CHARACTER_APPROVED`
- `REWARD`
- `MASTER_NOTE`
- `SESSION_SUMMARY`

Regras:
- membros da mesa visualizam eventos
- somente `MASTER` cria eventos manuais
- eventos retornam ordenados por `createdAt`
- se `characterId` for enviado, ele deve pertencer a mesa
- eventos automaticos sao criados em criacao da mesa, aprovacao de personagem, criacao de missao e aprovacao de submissao

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
- `PATCH /api/v1/admin/shop-products/:id`

### Excluir conteudo

- `DELETE /api/v1/admin/monsters/:id`
- `DELETE /api/v1/admin/bounties/:id`
- `DELETE /api/v1/admin/missions/:id`
- `DELETE /api/v1/admin/trainings/:id`
- `DELETE /api/v1/admin/npcs/:id`
- `DELETE /api/v1/admin/shop-products/:id`

### Gerenciar produtos da loja

- `GET /api/v1/admin/shop-products`
- `POST /api/v1/admin/shop-products`
- `PATCH /api/v1/admin/shop-products/:id`
- `DELETE /api/v1/admin/shop-products/:id`

Body de exemplo:

```json
{
  "slug": "starter-sword",
  "name": "Espada Inicial",
  "description": "Equipamento basico para novos jogadores.",
  "category": "weapon",
  "type": "weapon",
  "img": "/assets/items/starter-sword.png",
  "effect": "+4 ATK",
  "assetKind": "EQUIPMENT",
  "price": 90,
  "currency": "BRL",
  "rewardQuantity": 1,
  "isActive": true
}
```

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

### Overview do mercado

- `GET /api/v1/shop/market/characters/:characterId`

Retorna em uma chamada:
- carteira atual em `market.wallet`
- catalogo compravel em `market.buyCatalog`
- itens vendaveis em `market.sellableItems`
- equipamentos vendaveis em `market.sellableEquipments`

Campos relevantes para o front no `buyCatalog`:
- `buyPrice`
- `suggestedSellPrice`
- `canAfford`
- `rewardQuantity`
- `assetKind`

Campos relevantes para o front em listagens vendaveis:
- `unitSellPrice`
- `totalSellPrice` para itens com stack
- `isEquipped` para bloquear venda de equipamento equipado

Exemplo resumido:

```json
{
  "market": {
    "characterId": "character-id",
    "wallet": {
      "inventoryId": "inventory-id",
      "coins": 320
    },
    "buyCatalog": [
      {
        "id": "product-id",
        "slug": "tier-2-blade",
        "name": "Lamina do Guarda",
        "category": "weapon",
        "type": "weapon",
        "assetKind": "EQUIPMENT",
        "buyPrice": 160,
        "currency": "COINS",
        "rewardQuantity": 1,
        "suggestedSellPrice": 112,
        "canAfford": true
      }
    ],
    "sellableItems": [
      {
        "id": "item-id",
        "name": "Pocao Pequena de Vida",
        "quantity": 3,
        "unitSellPrice": 15,
        "totalSellPrice": 45
      }
    ],
    "sellableEquipments": [
      {
        "id": "equipment-id",
        "name": "Lamina do Recruta",
        "isEquipped": false,
        "unitSellPrice": 56
      }
    ]
  }
}
```

### Comprar no mercado

- `POST /api/v1/shop/market/purchases`

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
- aceita apenas produtos `ITEM` ou `EQUIPMENT`
- retorna `purchased.market = true`

### Vender para o mercado

- `POST /api/v1/shop/market/sales`

Body para item:

```json
{
  "characterId": "uuid-do-personagem",
  "assetType": "ITEM",
  "assetId": "uuid-do-item",
  "quantity": 2
}
```

Body para equipamento:

```json
{
  "characterId": "uuid-do-personagem",
  "assetType": "EQUIPMENT",
  "assetId": "uuid-do-equipamento",
  "quantity": 1
}
```

Regras:
- item pode vender stack parcial
- equipamento vende uma unidade por vez
- equipamento equipado retorna `409 EQUIPMENT_EQUIPPED_FOR_SALE`
- credita `coins` no inventario e registra transacao `MARKET_SALE`

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

Observacao:
- essa rota continua disponivel por compatibilidade
- para o front novo, preferir o fluxo de mercado em `/api/v1/shop/market/*`

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
  - `coin-pack-1000`
  - linha de equipamentos com 5 tiers para loja:
  - `tier-1-blade`, `tier-1-armor`, `tier-1-charm`
  - `tier-2-blade`, `tier-2-armor`, `tier-2-charm`
  - `tier-3-blade`, `tier-3-armor`, `tier-3-charm`
  - `tier-4-blade`, `tier-4-armor`, `tier-4-charm`
  - `tier-5-blade`, `tier-5-armor`, `tier-5-charm`

Se definir `SEED_ADMIN_EMAIL` no ambiente e esse usuario ja existir, o seed promove esse usuario para `ADMIN`.

## Observacoes importantes

- Todas as rotas protegidas exigem `Authorization: Bearer <token>`
- O backend usa validacao de payload e tratamento global de erro
- Protecao de API e logs de duracao estao documentados em
  `docs/api-protection-observability.md`
- O fluxo de pagamento ainda esta desacoplado do gateway; o endpoint de webhook aceita confirmacao manual/integrada
- O endpoint de `market` em gameplay continua existindo como acao rapida de jornada e nao substitui o mercado de compra e venda da loja
- Para producao, ajuste `CORS_ORIGIN` e `PAYMENT_WEBHOOK_SECRET`

## Resumo para Front

Rotas novas ou relevantes para a UI atual:
- `POST /api/v1/tables`
- `POST /api/v1/tables/join`
- `GET /api/v1/tables`
- `GET /api/v1/tables/:tableId/world`
- `PUT /api/v1/tables/:tableId/world`
- `POST /api/v1/tables/:tableId/characters`
- `GET /api/v1/tables/:tableId/characters`
- `PATCH /api/v1/tables/:tableId/characters/:characterId/review`
- `GET /api/v1/tables/:tableId/characters/:characterId/traits`
- `POST /api/v1/tables/:tableId/characters/:characterId/traits`
- `POST /api/v1/tables/:tableId/missions`
- `GET /api/v1/tables/:tableId/missions`
- `POST /api/v1/tables/:tableId/missions/:missionId/submissions`
- `GET /api/v1/tables/:tableId/timeline`
- `POST /api/v1/tables/:tableId/timeline`
- `GET /api/v1/shop/market/characters/:characterId`
- `POST /api/v1/shop/market/purchases`
- `POST /api/v1/shop/market/sales`
- `GET /api/v1/characters/rankings`
- `GET /api/v1/characters/:id/public-profile`

Sugestao de fluxo:
- tela de mercado: carregar `GET /api/v1/shop/market/characters/:characterId`
- comprar item/equipamento: usar `POST /api/v1/shop/market/purchases`
- vender item/equipamento: usar `POST /api/v1/shop/market/sales`
- leaderboard: usar `GET /api/v1/characters/rankings`
- detalhe de jogador do ranking: usar `GET /api/v1/characters/:id/public-profile`

Regras de interface importantes:
- `buyCatalog[].canAfford` pode dirigir estado de botao de compra
- `sellableEquipments[].isEquipped` deve bloquear venda visualmente
- item aceita venda parcial por `quantity`
- equipamento vende com `quantity = 1`
- ranking retorna tres blocos separados: `highestLevel`, `mostMissions`, `mostBounties`
- perfil publico retorna `stats` derivados e apenas equipamentos equipados
