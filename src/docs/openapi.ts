const idPathParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const characterIdPathParam = {
  name: "characterId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const sessionIdPathParam = {
  name: "sessionId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const combatSessionIdPathParam = {
  name: "combatSessionId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const tableIdPathParam = {
  name: "tableId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const missionIdPathParam = {
  name: "missionId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const submissionIdPathParam = {
  name: "submissionId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const traitIdPathParam = {
  name: "traitId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const authSecurity = [{ bearerAuth: [] }] as const;

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "GOB Backend API",
    version: "1.3.0",
    description:
      "API para autenticacao, personagens, inventario, gameplay, administracao de conteudo, loja, pagamentos e recompensas do jogo.",
  },
  servers: [{ url: "http://localhost:5000", description: "Desenvolvimento local" }],
  tags: [
    { name: "Health", description: "Operacao e disponibilidade da API" },
    { name: "Meta", description: "Metadados e versao da API" },
    { name: "Auth", description: "Autenticacao e sessao" },
    { name: "Users", description: "Perfil do usuario" },
    { name: "Characters", description: "Gestao de personagens e classes" },
    { name: "Inventory", description: "Inventario e equipamentos" },
    { name: "Gameplay", description: "Fluxos jogaveis e combate" },
    { name: "Admin", description: "Montagem de conteudo do jogo" },
    { name: "Rewards", description: "Resgate de recompensas" },
    { name: "Transactions", description: "Historico de transacoes" },
    { name: "Shop", description: "Loja e pagamentos" },
    { name: "Trades", description: "Trocas assíncronas entre jogadores" },
    { name: "PvP", description: "Duelo entre jogadores e ranking PvP" },
    { name: "Tables", description: "Mesas RPG assincronas, mundo, personagens, missoes e timeline" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    responses: {
      BadRequest: { description: "Payload invalido" },
      Unauthorized: { description: "Nao autenticado" },
      Forbidden: { description: "Sem permissao" },
      NotFound: { description: "Recurso nao encontrado" },
      Conflict: { description: "Conflito de estado ou duplicidade" },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      UserPublic: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          email: { type: "string", format: "email" },
          emailVerifiedAt: { type: "string", format: "date-time", nullable: true },
          accountRole: { type: "string", enum: ["USER", "ADMIN"] },
          theme: { type: "string", nullable: true },
        },
      },
      Class: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          tier: { type: "integer" },
          evolvesFrom: { type: "string", nullable: true },
          modifier: { type: "string" },
          description: { type: "string" },
          passive: { type: "string" },
        },
      },
      Character: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          level: { type: "integer" },
          xp: { type: "integer" },
          currentHealth: { type: "integer" },
          status: { type: "string", enum: ["READY", "WOUNDED", "DEFEATED"] },
          lastCombatAt: { type: "string", format: "date-time", nullable: true },
          lastRecoveredAt: { type: "string", format: "date-time", nullable: true },
          avatarId: { type: "string", nullable: true },
          titleId: { type: "string", nullable: true },
          bannerId: { type: "string", nullable: true },
          classId: { type: "string" },
          inventoryId: { type: "string", nullable: true },
        },
      },
      CharacterState: {
        type: "object",
        properties: {
          currentHealth: { type: "integer" },
          maxHealth: { type: "integer" },
          status: { type: "string", enum: ["READY", "WOUNDED", "DEFEATED"] },
          lastCombatAt: { type: "string", format: "date-time", nullable: true },
          lastRecoveredAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CharacterRankingEntry: {
        type: "object",
        properties: {
          position: { type: "integer" },
          score: { type: "integer" },
          metric: { type: "string", enum: ["LEVEL", "MISSIONS", "BOUNTIES"] },
          character: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              level: { type: "integer" },
              xp: { type: "integer" },
              currentHealth: { type: "integer" },
              status: { type: "string", enum: ["READY", "WOUNDED", "DEFEATED"] },
              coins: { type: "integer" },
              class: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  modifier: { type: "string" },
                },
              },
            },
          },
        },
      },
      PublicCharacterProfile: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          level: { type: "integer" },
          xp: { type: "integer" },
          currentHealth: { type: "integer" },
          status: { type: "string", enum: ["READY", "WOUNDED", "DEFEATED"] },
          lastCombatAt: { type: "string", format: "date-time", nullable: true },
          lastRecoveredAt: { type: "string", format: "date-time", nullable: true },
          class: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              modifier: { type: "string" },
              description: { type: "string" },
              passive: { type: "string", nullable: true },
            },
          },
          customization: {
            type: "object",
            properties: {
              avatarId: { type: "string", nullable: true },
              titleId: { type: "string", nullable: true },
              bannerId: { type: "string", nullable: true },
            },
          },
          stats: {
            type: "object",
            properties: {
              attack: { type: "integer" },
              defense: { type: "integer" },
              maxHealth: { type: "integer" },
              critChance: { type: "number" },
              critChancePercent: { type: "number" },
              descriptions: {
                type: "object",
                properties: {
                  attack: { type: "string" },
                  defense: { type: "string" },
                  maxHealth: { type: "string" },
                  critChance: { type: "string" },
                },
              },
            },
          },
          progression: {
            type: "object",
            properties: {
              missionsCompleted: { type: "integer" },
              bountiesCompleted: { type: "integer" },
            },
          },
          equipment: {
            type: "object",
            properties: {
              totalEquipped: { type: "integer" },
              equipped: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    category: { type: "string" },
                    type: { type: "string" },
                    img: { type: "string" },
                    effect: { type: "string", nullable: true },
                    levelRequirement: { type: "integer", nullable: true },
                    equippedAt: { type: "string", format: "date-time", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      GameplayAvailability: {
        type: "object",
        properties: {
          actionType: { type: "string" },
          nextAvailableAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CombatRound: {
        type: "object",
        properties: {
          round: { type: "integer" },
          actor: { type: "string", enum: ["character", "monster"] },
          damage: { type: "integer" },
          remainingEnemyHealth: { type: "integer", nullable: true },
          remainingCharacterHealth: { type: "integer", nullable: true },
        },
      },
      CombatResult: {
        type: "object",
        properties: {
          victory: { type: "boolean" },
          characterHealthRemaining: { type: "integer" },
          enemyHealthRemaining: { type: "integer" },
          stats: {
            type: "object",
            properties: {
              attack: { type: "integer" },
              defense: { type: "integer" },
              maxHealth: { type: "integer" },
              critChance: { type: "number" },
              critChancePercent: { type: "number" },
              descriptions: {
                type: "object",
                properties: {
                  attack: { type: "string" },
                  defense: { type: "string" },
                  maxHealth: { type: "string" },
                  critChance: { type: "string" },
                },
              },
            },
          },
          rounds: {
            type: "array",
            items: { $ref: "#/components/schemas/CombatRound" },
          },
        },
      },
      GameplayActionResult: {
        type: "object",
        properties: {
          action: { type: "string" },
          enemy: { type: "string", nullable: true },
          note: { type: "string", nullable: true },
          marketAction: { type: "string", nullable: true },
          trainingId: { type: "string", nullable: true },
          trainingType: { type: "string", nullable: true },
          npcId: { type: "string", nullable: true },
          npcName: { type: "string", nullable: true },
          interactionType: { type: "string", nullable: true },
          combat: { $ref: "#/components/schemas/CombatResult" },
          rewards: {
            type: "object",
            properties: {
              xp: { type: "integer", nullable: true },
              coins: { type: "integer", nullable: true },
              item: {
                type: "object",
                nullable: true,
                properties: {
                  name: { type: "string" },
                  value: { type: "integer" },
                  category: { type: "string" },
                  type: { type: "string" },
                  img: { type: "string" },
                  effect: { type: "string", nullable: true },
                  levelRequirement: { type: "integer", nullable: true },
                  quantity: { type: "integer" },
                },
              },
            },
          },
          progression: {
            type: "object",
            properties: {
              previousXp: { type: "integer" },
              currentXp: { type: "integer" },
              previousLevel: { type: "integer" },
              currentLevel: { type: "integer" },
              levelUps: { type: "integer" },
            },
          },
          inventory: {
            type: "object",
            properties: {
              id: { type: "string" },
              coins: { type: "integer" },
            },
          },
          characterState: { $ref: "#/components/schemas/CharacterState" },
          availability: { $ref: "#/components/schemas/GameplayAvailability" },
        },
      },
      MissionJourneyChoice: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          description: { type: "string", nullable: true },
          nextNodeId: { type: "string" },
        },
      },
      MissionJourneyEnemy: {
        type: "object",
        properties: {
          name: { type: "string" },
          imageUrl: { type: "string", nullable: true },
          level: { type: "integer" },
          health: { type: "integer" },
          attack: { type: "integer" },
          defense: { type: "integer" },
        },
      },
      MissionJourneyNode: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["DIALOGUE", "CHOICE", "COMBAT", "RETURN_TO_NPC", "COMPLETE"],
          },
          title: { type: "string", nullable: true },
          text: { type: "string", nullable: true },
          nextNodeId: { type: "string", nullable: true },
          npcId: { type: "string", nullable: true },
          enemy: {
            allOf: [{ $ref: "#/components/schemas/MissionJourneyEnemy" }],
            nullable: true,
          },
          choices: {
            type: "array",
            items: { $ref: "#/components/schemas/MissionJourneyChoice" },
          },
        },
      },
      MissionJourney: {
        type: "object",
        properties: {
          startNodeId: { type: "string" },
          nodes: {
            type: "array",
            items: { $ref: "#/components/schemas/MissionJourneyNode" },
          },
        },
      },
      CombatSession: {
        type: "object",
        properties: {
          id: { type: "string" },
          missionSessionId: { type: "string", nullable: true },
          sourceType: { type: "string", enum: ["BOUNTY_HUNT", "MISSION"] },
          sourceId: { type: "string" },
          status: { type: "string", enum: ["IN_PROGRESS", "VICTORY", "DEFEAT", "ESCAPED"] },
          turnNumber: { type: "integer" },
          availableAt: { type: "string", format: "date-time", nullable: true },
          enemy: {
            type: "object",
            properties: {
              name: { type: "string" },
              imageUrl: { type: "string", nullable: true },
              level: { type: "integer" },
              attack: { type: "integer" },
              defense: { type: "integer" },
              currentHealth: { type: "integer" },
              maxHealth: { type: "integer" },
            },
          },
          character: {
            type: "object",
            properties: {
              currentHealth: { type: "integer" },
              maxHealth: { type: "integer" },
              stats: {
                type: "object",
                properties: {
                  attack: { type: "integer" },
                  defense: { type: "integer" },
                  maxHealth: { type: "integer" },
                  critChance: { type: "number" },
                  critChancePercent: { type: "number" },
                },
              },
            },
          },
          actions: {
            type: "array",
            items: { type: "string", enum: ["ATTACK", "DEFEND", "POWER_ATTACK"] },
          },
          battleLog: {
            type: "array",
            items: { type: "object" },
          },
        },
      },
      MissionSession: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          status: {
            type: "string",
            enum: ["IN_PROGRESS", "READY_TO_TURN_IN", "COMPLETED", "FAILED", "ABANDONED"],
          },
          startedAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time", nullable: true },
          nextAvailableAt: { type: "string", format: "date-time", nullable: true },
          mission: { $ref: "#/components/schemas/MissionDefinition" },
          currentNode: { $ref: "#/components/schemas/MissionJourneyNode" },
          journeySummary: {
            type: "array",
            items: { $ref: "#/components/schemas/MissionJourneyNode" },
          },
          combatSession: {
            allOf: [{ $ref: "#/components/schemas/CombatSession" }],
            nullable: true,
          },
          completion: {
            type: "object",
            nullable: true,
            properties: {
              rewards: { type: "object" },
              progression: { type: "object" },
              inventory: { type: "object" },
              transaction: { type: "object" },
            },
          },
        },
      },
      Monster: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          imageUrl: { type: "string", nullable: true },
          level: { type: "integer" },
          health: { type: "integer" },
          attack: { type: "integer" },
          defense: { type: "integer" },
          experience: { type: "integer" },
        },
      },
      Bounty: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          monsterId: { type: "string" },
          recommendedLevel: { type: "integer" },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD", "ELITE"] },
          reward: { type: "integer" },
          rewardXp: { type: "integer" },
          status: { type: "string" },
          isActive: { type: "boolean" },
          timeLimit: { type: "string", format: "date-time" },
          monster: { $ref: "#/components/schemas/Monster" },
        },
      },
      MissionDefinition: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD", "ELITE"] },
          recommendedLevel: { type: "integer" },
          imageUrl: { type: "string", nullable: true },
          startNpcId: { type: "string", nullable: true },
          completionNpcId: { type: "string", nullable: true },
          startDialogue: { type: "string", nullable: true },
          completionDialogue: { type: "string", nullable: true },
          repeatCooldownSeconds: { type: "integer" },
          journey: {
            allOf: [{ $ref: "#/components/schemas/MissionJourney" }],
            nullable: true,
          },
          enemyName: { type: "string" },
          enemyLevel: { type: "integer" },
          enemyHealth: { type: "integer" },
          enemyAttack: { type: "integer" },
          enemyDefense: { type: "integer" },
          rewardXp: { type: "integer" },
          rewardCoins: { type: "integer" },
          startNpc: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              imageUrl: { type: "string", nullable: true },
            },
          },
          completionNpc: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              imageUrl: { type: "string", nullable: true },
            },
          },
          journeySummary: {
            type: "array",
            items: { $ref: "#/components/schemas/MissionJourneyNode" },
          },
          isActive: { type: "boolean" },
        },
      },
      TrainingDefinition: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          trainingType: { type: "string" },
          xpReward: { type: "integer" },
          coinsReward: { type: "integer" },
          cooldownSeconds: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      NpcDefinition: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string" },
          interactionType: { type: "string" },
          imageUrl: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          dialogue: { type: "string", nullable: true },
          xpReward: { type: "integer" },
          coinsReward: { type: "integer" },
          startingMissions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                isActive: { type: "boolean" },
              },
            },
          },
          completionMissions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                isActive: { type: "boolean" },
              },
            },
          },
          isActive: { type: "boolean" },
        },
      },
      AuthSuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          token: { type: "string" },
          user: { $ref: "#/components/schemas/UserPublic" },
          emailVerificationRequired: { type: "boolean" },
          emailDelivery: { type: "string", enum: ["SENT", "FAILED"] },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["nome", "email", "senha"],
        properties: {
          nome: { type: "string" },
          email: { type: "string", format: "email" },
          senha: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "senha"],
        properties: {
          email: { type: "string", format: "email" },
          senha: { type: "string" },
        },
      },
      ConfirmEmailRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string" },
        },
      },
      ResendEmailVerificationRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      UpdateProfileRequest: {
        type: "object",
        properties: {
          nome: { type: "string" },
          email: { type: "string", format: "email" },
          theme: { type: "string", enum: ["default", "ocean", "ember", "verdant"] },
        },
      },
      CreateCharacterRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          classId: { type: "string" },
        },
      },
      UpdateCharacterRequest: {
        type: "object",
        properties: { name: { type: "string" } },
      },
      UpdateCharacterProgressRequest: {
        type: "object",
        properties: {
          xp: { type: "integer" },
          level: { type: "integer", maximum: 60 },
          lastCheckpoint: { type: "string" },
        },
      },
      UpdateCharacterPositionRequest: {
        type: "object",
        properties: {
          posX: { type: "number" },
          posY: { type: "number" },
          posZ: { type: "number" },
          lastCheckpoint: { type: "string" },
        },
      },
      UpdateCharacterCustomizationRequest: {
        type: "object",
        properties: {
          avatarId: { type: "string", enum: ["blade", "crown", "phoenix", "moon"] },
          titleId: { type: "string", enum: ["wanderer", "hunter", "warden", "arcanist"] },
          bannerId: { type: "string", enum: ["royal", "ocean", "ember", "verdant"] },
        },
      },
      ClaimRewardRequest: {
        type: "object",
        required: ["characterId", "claimKey", "type", "value"],
        properties: {
          characterId: { type: "string" },
          claimKey: { type: "string" },
          type: { type: "string", enum: ["COINS", "XP"] },
          value: { type: "integer" },
          metadata: { type: "string" },
        },
      },
      PurchaseRequest: {
        type: "object",
        required: ["characterId", "productId", "quantity"],
        properties: {
          characterId: { type: "string" },
          productId: { type: "string" },
          quantity: { type: "integer" },
        },
      },
      MarketSaleRequest: {
        type: "object",
        required: ["characterId", "assetType", "assetId", "quantity"],
        properties: {
          characterId: { type: "string" },
          assetType: { type: "string", enum: ["ITEM", "EQUIPMENT"] },
          assetId: { type: "string" },
          quantity: { type: "integer" },
        },
      },
      PaymentOrderRequest: {
        type: "object",
        required: ["characterId", "productId", "quantity"],
        properties: {
          characterId: { type: "string" },
          productId: { type: "string" },
          quantity: { type: "integer" },
          provider: { type: "string" },
        },
      },
      PaymentWebhookRequest: {
        type: "object",
        required: ["status"],
        anyOf: [{ required: ["orderId"] }, { required: ["providerReference"] }],
        properties: {
          orderId: { type: "string" },
          providerReference: { type: "string" },
          providerPaymentId: { type: "string" },
          status: { type: "string", enum: ["PAID", "FAILED", "CANCELED"] },
          failureReason: { type: "string" },
        },
      },
      TradeAssetRequest: {
        type: "object",
        required: ["assetType", "assetId"],
        properties: {
          assetType: { type: "string", enum: ["ITEM", "EQUIPMENT"] },
          assetId: { type: "string" },
          quantity: { type: "integer" },
        },
      },
      CreateTradeRequest: {
        type: "object",
        required: ["requesterCharacterId", "targetCharacterId"],
        properties: {
          requesterCharacterId: { type: "string" },
          targetCharacterId: { type: "string" },
          offeredCoins: { type: "integer" },
          requestedCoins: { type: "integer" },
          note: { type: "string" },
          expiresInHours: { type: "integer" },
          offeredAssets: {
            type: "array",
            items: { $ref: "#/components/schemas/TradeAssetRequest" },
          },
          requestedAssets: {
            type: "array",
            items: { $ref: "#/components/schemas/TradeAssetRequest" },
          },
        },
      },
      RespondTradeRequest: {
        type: "object",
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["ACCEPT", "REJECT", "CANCEL"] },
        },
      },
      CreatePvpMatchRequest: {
        type: "object",
        required: ["characterId", "opponentCharacterId"],
        properties: {
          characterId: { type: "string" },
          opponentCharacterId: { type: "string" },
        },
      },
      BountyActionRequest: {
        type: "object",
        required: ["bountyId"],
        properties: { bountyId: { type: "string" } },
      },
      MissionActionRequest: {
        type: "object",
        required: ["missionId"],
        properties: { missionId: { type: "string" } },
      },
      StartMissionJourneyRequest: {
        type: "object",
        required: ["missionId", "npcId"],
        properties: {
          missionId: { type: "string" },
          npcId: { type: "string" },
        },
      },
      ProgressMissionJourneyRequest: {
        type: "object",
        properties: {
          choiceId: { type: "string" },
          npcId: { type: "string" },
        },
      },
      TrainingActionRequest: {
        type: "object",
        required: ["trainingId"],
        properties: { trainingId: { type: "string" } },
      },
      NpcActionRequest: {
        type: "object",
        required: ["npcId"],
        properties: {
          npcId: { type: "string" },
          buffPercent: { type: "integer", enum: [2, 4, 6] },
        },
      },
      MarketActionRequest: {
        type: "object",
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["barter", "scavenge"] },
        },
      },
      CombatTurnRequest: {
        type: "object",
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["ATTACK", "DEFEND", "POWER_ATTACK"] },
        },
      },
      AdminMonsterRequest: {
        type: "object",
        required: ["name", "level", "health", "attack", "defense", "experience"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          imageUrl: { type: "string" },
          level: { type: "integer" },
          health: { type: "integer" },
          attack: { type: "integer" },
          defense: { type: "integer" },
          experience: { type: "integer" },
        },
      },
      AdminBountyRequest: {
        type: "object",
        required: [
          "title",
          "monsterId",
          "recommendedLevel",
          "difficulty",
          "reward",
          "rewardXp",
          "timeLimit",
          "status",
        ],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          monsterId: { type: "string" },
          recommendedLevel: { type: "integer" },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD", "ELITE"] },
          reward: { type: "integer" },
          rewardXp: { type: "integer" },
          rewardItemName: { type: "string" },
          rewardItemCategory: { type: "string" },
          rewardItemType: { type: "string" },
          rewardItemImg: { type: "string" },
          rewardItemEffect: { type: "string" },
          rewardItemValue: { type: "integer" },
          rewardItemQuantity: { type: "integer" },
          timeLimit: { type: "string", format: "date-time" },
          status: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      ShopProduct: {
        type: "object",
        properties: {
          id: { type: "string" },
          slug: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          category: { type: "string" },
          type: { type: "string" },
          img: { type: "string" },
          effect: { type: "string", nullable: true },
          levelRequirement: { type: "integer", nullable: true },
          assetKind: { type: "string", enum: ["ITEM", "EQUIPMENT", "COINS"] },
          price: { type: "integer" },
          currency: { type: "string" },
          rewardCoins: { type: "integer" },
          rewardQuantity: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      AdminBountyUpdateRequest: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          monsterId: { type: "string" },
          recommendedLevel: { type: "integer" },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD", "ELITE"] },
          reward: { type: "integer" },
          rewardXp: { type: "integer" },
          rewardItemName: { type: "string" },
          rewardItemCategory: { type: "string" },
          rewardItemType: { type: "string" },
          rewardItemImg: { type: "string" },
          rewardItemEffect: { type: "string" },
          rewardItemValue: { type: "integer" },
          rewardItemQuantity: { type: "integer" },
          timeLimit: { type: "string", format: "date-time" },
          status: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      AdminMissionRequest: {
        type: "object",
        required: [
          "title",
          "difficulty",
          "recommendedLevel",
          "enemyName",
          "enemyLevel",
          "enemyHealth",
          "enemyAttack",
          "enemyDefense",
          "rewardXp",
          "rewardCoins",
        ],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD", "ELITE"] },
          recommendedLevel: { type: "integer" },
          imageUrl: { type: "string" },
          startNpcId: { type: "string", nullable: true },
          completionNpcId: { type: "string", nullable: true },
          startDialogue: { type: "string" },
          completionDialogue: { type: "string" },
          repeatCooldownSeconds: { type: "integer" },
          journey: { $ref: "#/components/schemas/AdminMissionJourneyRequest" },
          enemyName: { type: "string" },
          enemyLevel: { type: "integer" },
          enemyHealth: { type: "integer" },
          enemyAttack: { type: "integer" },
          enemyDefense: { type: "integer" },
          rewardXp: { type: "integer" },
          rewardCoins: { type: "integer" },
          rewardItemName: { type: "string" },
          rewardItemCategory: { type: "string" },
          rewardItemType: { type: "string" },
          rewardItemImg: { type: "string" },
          rewardItemEffect: { type: "string" },
          rewardItemValue: { type: "integer" },
          rewardItemQuantity: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      AdminMissionUpdateRequest: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD", "ELITE"] },
          recommendedLevel: { type: "integer" },
          imageUrl: { type: "string" },
          startNpcId: { type: "string" },
          completionNpcId: { type: "string" },
          startDialogue: { type: "string" },
          completionDialogue: { type: "string" },
          repeatCooldownSeconds: { type: "integer" },
          journey: { $ref: "#/components/schemas/AdminMissionJourneyRequest" },
          enemyName: { type: "string" },
          enemyLevel: { type: "integer" },
          enemyHealth: { type: "integer" },
          enemyAttack: { type: "integer" },
          enemyDefense: { type: "integer" },
          rewardXp: { type: "integer" },
          rewardCoins: { type: "integer" },
          rewardItemName: { type: "string" },
          rewardItemCategory: { type: "string" },
          rewardItemType: { type: "string" },
          rewardItemImg: { type: "string" },
          rewardItemEffect: { type: "string" },
          rewardItemValue: { type: "integer" },
          rewardItemQuantity: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      AdminTrainingRequest: {
        type: "object",
        required: ["name", "trainingType", "xpReward"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          trainingType: { type: "string" },
          xpReward: { type: "integer" },
          coinsReward: { type: "integer" },
          cooldownSeconds: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      AdminTrainingUpdateRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          trainingType: { type: "string" },
          xpReward: { type: "integer" },
          coinsReward: { type: "integer" },
          cooldownSeconds: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      AdminNpcRequest: {
        type: "object",
        required: ["name", "role", "interactionType"],
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          interactionType: { type: "string" },
          imageUrl: { type: "string" },
          description: { type: "string" },
          dialogue: { type: "string" },
          xpReward: { type: "integer" },
          coinsReward: { type: "integer" },
          rewardItemName: { type: "string" },
          rewardItemCategory: { type: "string" },
          rewardItemType: { type: "string" },
          rewardItemImg: { type: "string" },
          rewardItemEffect: { type: "string" },
          rewardItemValue: { type: "integer" },
          rewardItemQuantity: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      AdminMissionJourneyRequest: {
        type: "object",
        properties: {
          startNodeId: { type: "string" },
          nodes: {
            type: "array",
            items: { $ref: "#/components/schemas/MissionJourneyNode" },
          },
        },
      },
      AdminNpcUpdateRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          interactionType: { type: "string" },
          imageUrl: { type: "string" },
          description: { type: "string" },
          dialogue: { type: "string" },
          xpReward: { type: "integer" },
          coinsReward: { type: "integer" },
          rewardItemName: { type: "string" },
          rewardItemCategory: { type: "string" },
          rewardItemType: { type: "string" },
          rewardItemImg: { type: "string" },
          rewardItemEffect: { type: "string" },
          rewardItemValue: { type: "integer" },
          rewardItemQuantity: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      AdminShopProductRequest: {
        type: "object",
        required: ["slug", "name", "category", "type", "img", "assetKind", "price"],
        properties: {
          slug: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          type: { type: "string" },
          img: { type: "string" },
          effect: { type: "string" },
          levelRequirement: { type: "integer" },
          assetKind: { type: "string", enum: ["ITEM", "EQUIPMENT", "COINS"] },
          price: { type: "integer" },
          currency: { type: "string" },
          rewardCoins: { type: "integer" },
          rewardQuantity: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      AdminShopProductUpdateRequest: {
        type: "object",
        properties: {
          slug: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          type: { type: "string" },
          img: { type: "string" },
          effect: { type: "string" },
          levelRequirement: { type: "integer" },
          assetKind: { type: "string", enum: ["ITEM", "EQUIPMENT", "COINS"] },
          price: { type: "integer" },
          currency: { type: "string" },
          rewardCoins: { type: "integer" },
          rewardQuantity: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      CreateTableRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Cronicas de Eldoria" },
        },
      },
      JoinTableRequest: {
        type: "object",
        required: ["joinCode"],
        properties: {
          joinCode: { type: "string", example: "AB12CD" },
        },
      },
      TableResponse: {
        type: "object",
        required: [
          "id",
          "name",
          "masterId",
          "currentUserRole",
          "isMaster",
          "memberStatus",
          "membersCount",
        ],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          masterId: { type: "string" },
          currentUserRole: { type: "string", enum: ["MASTER", "PLAYER"] },
          isMaster: { type: "boolean" },
          memberStatus: {
            type: "string",
            enum: ["ACTIVE", "INVITED", "REMOVED"],
          },
          membersCount: { type: "integer" },
          joinCode: {
            type: "string",
            description: "Returned only when the current user is this table's MASTER.",
          },
          code: {
            type: "string",
            description: "Alias of joinCode, returned only to the table MASTER.",
          },
          maxPlayers: { type: "integer" },
          playerCount: { type: "integer" },
        },
      },
      MasterOverviewResponse: {
        type: "object",
        required: [
          "table",
          "world",
          "members",
          "characters",
          "missions",
          "submissions",
          "timeline",
          "onboardingChecklist",
          "nextRecommendedAction",
        ],
        properties: {
          table: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              joinCode: { type: "string" },
              code: { type: "string" },
              maxPlayers: { type: "integer" },
              status: { type: "string", enum: ["ACTIVE", "ARCHIVED"] },
              membersCount: { type: "integer" },
              currentUserRole: { type: "string", enum: ["MASTER"] },
              isMaster: { type: "boolean", enum: [true] },
            },
          },
          world: {
            type: "object",
            properties: {
              hasWorld: { type: "boolean" },
              worldId: { type: "string", nullable: true },
              worldTitle: { type: "string", nullable: true },
              hasSummary: { type: "boolean" },
              hasRules: { type: "boolean" },
              hasCharacterCriteria: { type: "boolean" },
            },
          },
          members: {
            type: "object",
            properties: {
              totalMembers: { type: "integer" },
              totalPlayers: { type: "integer" },
              hasPlayers: { type: "boolean" },
            },
          },
          characters: {
            type: "object",
            properties: {
              totalCharacters: { type: "integer" },
              pendingCharacters: { type: "integer" },
              approvedCharacters: { type: "integer" },
              rejectedCharacters: { type: "integer" },
              needsChangesCharacters: { type: "integer" },
            },
          },
          missions: {
            type: "object",
            properties: {
              totalMissions: { type: "integer" },
              activeMissions: { type: "integer" },
              hasActiveMission: { type: "boolean" },
              latestMission: { type: "object", nullable: true },
            },
          },
          submissions: {
            type: "object",
            properties: {
              pendingSubmissions: { type: "integer" },
              reviewedSubmissions: { type: "integer" },
            },
          },
          timeline: {
            type: "object",
            properties: {
              totalEvents: { type: "integer" },
              hasTimeline: { type: "boolean" },
              latestEvent: { type: "object", nullable: true },
            },
          },
          onboardingChecklist: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                done: { type: "boolean" },
              },
            },
          },
          nextRecommendedAction: {
            type: "object",
            properties: {
              key: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              ctaLabel: { type: "string" },
            },
          },
        },
      },
      AiWorldSummaryRequest: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          currentWorld: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              tone: { type: "string" },
              rules: { type: "string" },
              characterCriteria: { type: "string" },
            },
          },
        },
      },
      AiMissionIdeasRequest: {
        type: "object",
        required: ["worldSummary", "characters"],
        properties: {
          theme: { type: "string" },
          difficulty: { type: "string" },
          worldSummary: { type: "string" },
          activeArc: { type: "string" },
          characters: {
            type: "array",
            maxItems: 10,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                className: { type: "string" },
                summary: { type: "string" },
              },
            },
          },
        },
      },
      AiTraitsRequest: {
        type: "object",
        required: ["characterId"],
        properties: {
          characterId: { type: "string" },
          instruction: { type: "string" },
        },
      },
      AiTimelineSummaryRequest: {
        type: "object",
        required: ["notes", "eventType"],
        properties: {
          notes: { type: "string" },
          eventType: {
            type: "string",
            enum: ["SESSION_SUMMARY", "MASTER_NOTE"],
          },
        },
      },
      TableWorldRequest: {
        type: "object",
        required: ["campaignTitle", "summary"],
        properties: {
          campaignTitle: { type: "string" },
          summary: { type: "string" },
          tone: { type: "string", nullable: true },
          rules: { type: "object", nullable: true },
          characterCreationCriteria: { type: "object", nullable: true },
        },
      },
      TableCharacterRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          classId: { type: "string" },
        },
      },
      TableCharacterReviewRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["APPROVED", "REJECTED", "NEEDS_CHANGES"] },
          masterFeedback: { type: "string", nullable: true },
        },
      },
      CharacterTraitRequest: {
        type: "object",
        required: ["type", "name"],
        properties: {
          type: { type: "string", enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
          name: { type: "string" },
          description: { type: "string", nullable: true },
        },
      },
      TableMissionRequest: {
        type: "object",
        required: ["title", "description"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          objective: { type: "string", nullable: true },
          isRequired: { type: "boolean", default: true },
          dueDate: { type: "string", format: "date-time", nullable: true },
        },
      },
      TableMissionUpdateRequest: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          objective: { type: "string", nullable: true },
          isRequired: { type: "boolean" },
          status: { type: "string", enum: ["ACTIVE", "COMPLETED", "ARCHIVED"] },
          dueDate: { type: "string", format: "date-time", nullable: true },
        },
      },
      TableMissionSubmissionRequest: {
        type: "object",
        required: ["characterId", "content"],
        properties: {
          characterId: { type: "string" },
          content: { type: "string" },
        },
      },
      TableMissionSubmissionReviewRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["APPROVED", "REJECTED", "NEEDS_CHANGES"] },
          masterNote: { type: "string", nullable: true },
        },
      },
      TableTimelineEventRequest: {
        type: "object",
        required: ["title", "description", "type"],
        properties: {
          characterId: { type: "string", nullable: true },
          title: { type: "string" },
          description: { type: "string" },
          type: {
            type: "string",
            enum: [
              "STORY",
              "MISSION_CREATED",
              "MISSION_APPROVED",
              "CHARACTER_APPROVED",
              "REWARD",
              "MASTER_NOTE",
              "SESSION_SUMMARY",
            ],
          },
        },
      },
      MetaVersionResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          name: { type: "string" },
          version: { type: "string" },
          environment: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": { get: { tags: ["Health"], summary: "Healthcheck simples", responses: { "200": { description: "OK" } } } },
    "/ready": { get: { tags: ["Health"], summary: "Readiness com banco", responses: { "200": { description: "OK" } } } },
    "/api/v1/meta/version": {
      get: {
        tags: ["Meta"],
        summary: "Obter versao atual da API",
        responses: {
          "200": {
            description: "Versao retornada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MetaVersionResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Registrar usuario",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
        responses: { "201": { description: "Usuario criado" }, "400": { $ref: "#/components/responses/BadRequest" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Autenticar usuario",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: { "200": { description: "Login realizado" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } },
      },
    },
    "/api/v1/auth/email-verification/confirm": {
      post: {
        tags: ["Auth"],
        summary: "Confirmar e-mail",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ConfirmEmailRequest" } } } },
        responses: { "200": { description: "E-mail confirmado" }, "400": { $ref: "#/components/responses/BadRequest" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/auth/email-verification/resend": {
      post: {
        tags: ["Auth"],
        summary: "Reenviar confirmacao de e-mail",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ResendEmailVerificationRequest" } } } },
        responses: { "200": { description: "Solicitacao processada" }, "400": { $ref: "#/components/responses/BadRequest" }, "429": { description: "Cooldown ou rate limit excedido" } },
      },
    },
    "/api/v1/auth/me": { get: { tags: ["Auth"], summary: "Obter usuario autenticado", security: authSecurity, responses: { "200": { description: "Usuario autenticado" }, "401": { $ref: "#/components/responses/Unauthorized" } } } },
    "/api/v1/users/me/profile": {
      get: { tags: ["Users"], summary: "Obter perfil", security: authSecurity, responses: { "200": { description: "Perfil retornado" }, "401": { $ref: "#/components/responses/Unauthorized" } } },
      patch: {
        tags: ["Users"],
        summary: "Atualizar perfil",
        security: authSecurity,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProfileRequest" } } } },
        responses: { "200": { description: "Perfil atualizado" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/characters/classes": { get: { tags: ["Characters"], summary: "Listar classes", security: authSecurity, responses: { "200": { description: "Classes retornadas" }, "401": { $ref: "#/components/responses/Unauthorized" } } } },
    "/api/v1/characters": {
      get: { tags: ["Characters"], summary: "Listar personagens", security: authSecurity, responses: { "200": { description: "Lista de personagens" }, "401": { $ref: "#/components/responses/Unauthorized" } } },
      post: {
        tags: ["Characters"],
        summary: "Criar personagem",
        security: authSecurity,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateCharacterRequest" } } } },
        responses: { "201": { description: "Personagem criado" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/api/v1/characters/rankings": {
      get: {
        tags: ["Characters"],
        summary: "Leaderboard de level, missoes e bounties",
        security: authSecurity,
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
          },
        ],
        responses: {
          "200": { description: "Rankings retornados" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/characters/{id}/public-profile": {
      get: {
        tags: ["Characters"],
        summary: "Perfil publico do personagem para leaderboard",
        security: authSecurity,
        parameters: [idPathParam],
        responses: {
          "200": { description: "Perfil publico retornado" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/v1/characters/{id}": {
      get: { tags: ["Characters"], summary: "Buscar personagem por id", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Personagem encontrado" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } } },
      put: {
        tags: ["Characters"],
        summary: "Atualizar nome do personagem",
        security: authSecurity,
        parameters: [idPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateCharacterRequest" } } } },
        responses: { "200": { description: "Personagem atualizado" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: { tags: ["Characters"], summary: "Excluir personagem", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Personagem removido" } } },
    },
    "/api/v1/characters/{id}/summary": { get: { tags: ["Characters"], summary: "Resumo do personagem com HP/status e historico recente", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Resumo retornado" } } } },
    "/api/v1/characters/{id}/progress": {
      patch: {
        tags: ["Characters"],
        summary: "Atualizar progresso",
        security: authSecurity,
        parameters: [idPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateCharacterProgressRequest" } } } },
        responses: { "200": { description: "Progresso atualizado" } },
      },
    },
    "/api/v1/characters/{id}/position": {
      patch: {
        tags: ["Characters"],
        summary: "Atualizar posicao",
        security: authSecurity,
        parameters: [idPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateCharacterPositionRequest" } } } },
        responses: { "200": { description: "Posicao atualizada" } },
      },
    },
    "/api/v1/characters/{id}/customization": {
      patch: {
        tags: ["Characters"],
        summary: "Atualizar personalizacao visual do personagem",
        security: authSecurity,
        parameters: [idPathParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCharacterCustomizationRequest" },
            },
          },
        },
        responses: { "200": { description: "Personalizacao atualizada" } },
      },
    },
    "/api/v1/inventory/characters/{characterId}": { get: { tags: ["Inventory"], summary: "Obter inventario", security: authSecurity, parameters: [characterIdPathParam], responses: { "200": { description: "Inventario retornado" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } } } },
    "/api/v1/inventory/characters/{characterId}/wallet": { get: { tags: ["Inventory"], summary: "Obter carteira", security: authSecurity, parameters: [characterIdPathParam], responses: { "200": { description: "Carteira retornada" } } } },
    "/api/v1/inventory/characters/{characterId}/items/{itemId}/use": { post: { tags: ["Inventory"], summary: "Usar item", security: authSecurity, parameters: [characterIdPathParam, { name: "itemId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Item usado" } } } },
    "/api/v1/inventory/characters/{characterId}/equipments/{equipmentId}/equip": { post: { tags: ["Inventory"], summary: "Equipar equipamento", security: authSecurity, parameters: [characterIdPathParam, { name: "equipmentId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Equipamento equipado" } } } },
    "/api/v1/inventory/characters/{characterId}/equipments/{equipmentId}/unequip": { post: { tags: ["Inventory"], summary: "Desequipar equipamento", security: authSecurity, parameters: [characterIdPathParam, { name: "equipmentId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Equipamento desequipado" }, "409": { $ref: "#/components/responses/Conflict" } } } },
    "/api/v1/gameplay/journey": { get: { tags: ["Gameplay"], summary: "Obter jornada e opcoes", responses: { "200": { description: "Jornada retornada" } } } },
    "/api/v1/gameplay/monsters": { get: { tags: ["Gameplay"], summary: "Listar monstros", responses: { "200": { description: "Monstros retornados" } } } },
    "/api/v1/gameplay/bounties": { get: { tags: ["Gameplay"], summary: "Listar bounties ativas", description: "Cada bounty so pode ser concluida uma vez por personagem enquanto estiver ativa.", responses: { "200": { description: "Bounties retornadas" } } } },
    "/api/v1/gameplay/missions": { get: { tags: ["Gameplay"], summary: "Listar missoes ativas", description: "Missoes agora podem ter NPC de origem, NPC de entrega, imagem e jornada ramificada com escolhas e combate manual.", responses: { "200": { description: "Missoes retornadas" } } } },
    "/api/v1/gameplay/trainings": { get: { tags: ["Gameplay"], summary: "Listar treinamentos ativos", description: "Treinamentos expõem cooldownSeconds e entram em cooldown por personagem apos execucao.", responses: { "200": { description: "Treinamentos retornados" } } } },
    "/api/v1/gameplay/npcs": { get: { tags: ["Gameplay"], summary: "Listar NPCs ativos", description: "NPCs possuem cooldown por personagem, imagem e lista das missoes que podem iniciar.", responses: { "200": { description: "NPCs retornados" } } } },
    "/api/v1/gameplay/characters/{characterId}/missions/sessions": {
      get: {
        tags: ["Gameplay"],
        summary: "Listar sessoes de missao do personagem",
        description: "Retorna as jornadas em andamento ou prontas para entrega, incluindo no atual e combate vinculado quando existir.",
        security: authSecurity,
        parameters: [characterIdPathParam],
        responses: { "200": { description: "Sessoes retornadas" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/missions/sessions/{sessionId}": {
      get: {
        tags: ["Gameplay"],
        summary: "Obter sessao de missao",
        security: authSecurity,
        parameters: [characterIdPathParam, sessionIdPathParam],
        responses: { "200": { description: "Sessao retornada" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/missions/start": {
      post: {
        tags: ["Gameplay"],
        summary: "Iniciar jornada de missao por NPC",
        description: "Inicia uma missao vinculada ao NPC de origem configurado no administrador.",
        security: authSecurity,
        parameters: [characterIdPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StartMissionJourneyRequest" } } } },
        responses: { "200": { description: "Jornada iniciada" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/missions/sessions/{sessionId}/progress": {
      post: {
        tags: ["Gameplay"],
        summary: "Avancar etapa da jornada",
        description: "Usado para seguir dialogos, escolher um caminho ou entregar a missao ao NPC correto.",
        security: authSecurity,
        parameters: [characterIdPathParam, sessionIdPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProgressMissionJourneyRequest" } } } },
        responses: { "200": { description: "Jornada atualizada" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/missions/sessions/{sessionId}/abandon": {
      post: {
        tags: ["Gameplay"],
        summary: "Abandonar sessao de missao",
        description: "Marca a jornada como abandonada e encerra o combate vinculado como escaped quando houver um combate em andamento.",
        security: authSecurity,
        parameters: [characterIdPathParam, sessionIdPathParam],
        responses: { "200": { description: "Missao abandonada" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/actions/bounty-hunt": {
      post: {
        tags: ["Gameplay"],
        summary: "Executar bounty hunt",
        description: "Cria uma sessao de combate manual por turnos para a bounty. O combate e resolvido depois pelo endpoint de acoes da combat session.",
        security: authSecurity,
        parameters: [characterIdPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BountyActionRequest" } } } },
        responses: { "200": { description: "Bounty hunt executada" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/actions/missions": {
      post: {
        tags: ["Gameplay"],
        summary: "Executar missao sem NPC de origem",
        description: "Cria uma sessao de jornada para missoes que nao exigem NPC de origem.",
        security: authSecurity,
        parameters: [characterIdPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MissionActionRequest" } } } },
        responses: { "200": { description: "Missao executada" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/actions/training": {
      post: {
        tags: ["Gameplay"],
        summary: "Executar treinamento",
        description: "Retorna availability.nextAvailableAt com o cooldown do treino para aquele personagem.",
        security: authSecurity,
        parameters: [characterIdPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TrainingActionRequest" } } } },
        responses: { "200": { description: "Treinamento executado" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/actions/npc-interaction": {
      post: {
        tags: ["Gameplay"],
        summary: "Executar interacao com NPC",
        description: "Retorna characterState atualizado. Quando interactionType for healer, o personagem volta para HP maximo e status READY.",
        security: authSecurity,
        parameters: [characterIdPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NpcActionRequest" } } } },
        responses: { "200": { description: "Interacao executada" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/actions/market": {
      post: {
        tags: ["Gameplay"],
        summary: "Executar acao de mercado",
        description: "Cada acao de mercado tem cooldown por personagem e retorna availability.nextAvailableAt.",
        security: authSecurity,
        parameters: [characterIdPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MarketActionRequest" } } } },
        responses: { "200": { description: "Acao de mercado executada" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/gameplay/characters/{characterId}/combat-sessions/{combatSessionId}/actions": {
      post: {
        tags: ["Gameplay"],
        summary: "Executar turno de combate manual",
        description: "Recebe a acao do jogador para a sessao ativa. O backend aplica o turno do player, resolve a resposta inimiga e fecha a sessao em vitoria ou derrota quando aplicavel.",
        security: authSecurity,
        parameters: [characterIdPathParam, combatSessionIdPathParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CombatTurnRequest" } } } },
        responses: { "200": { description: "Turno processado" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/api/v1/admin/monsters": {
      get: { tags: ["Admin"], summary: "Listar monstros", security: authSecurity, responses: { "200": { description: "Monstros retornados" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } } },
      post: { tags: ["Admin"], summary: "Criar monstro", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminMonsterRequest" } } } }, responses: { "201": { description: "Monstro criado" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } } },
    },
    "/api/v1/admin/monsters/{id}": {
      patch: { tags: ["Admin"], summary: "Atualizar monstro", security: authSecurity, parameters: [idPathParam], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, level: { type: "integer" }, health: { type: "integer" }, attack: { type: "integer" }, defense: { type: "integer" }, experience: { type: "integer" } } } } } }, responses: { "200": { description: "Monstro atualizado" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
      delete: { tags: ["Admin"], summary: "Excluir monstro", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Monstro excluido" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" } } },
    },
    "/api/v1/admin/bounties": {
      get: { tags: ["Admin"], summary: "Listar bounties", security: authSecurity, responses: { "200": { description: "Bounties retornadas" } } },
      post: { tags: ["Admin"], summary: "Criar bounty", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminBountyRequest" } } } }, responses: { "201": { description: "Bounty criada" } } },
    },
    "/api/v1/admin/bounties/{id}": {
      patch: { tags: ["Admin"], summary: "Atualizar bounty", security: authSecurity, parameters: [idPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminBountyUpdateRequest" } } } }, responses: { "200": { description: "Bounty atualizada" }, "400": { $ref: "#/components/responses/BadRequest" } } },
      delete: { tags: ["Admin"], summary: "Excluir bounty", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Bounty excluida" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/admin/missions": {
      get: { tags: ["Admin"], summary: "Listar missoes", security: authSecurity, responses: { "200": { description: "Missoes retornadas" } } },
      post: { tags: ["Admin"], summary: "Criar missao", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminMissionRequest" } } } }, responses: { "201": { description: "Missao criada" } } },
    },
    "/api/v1/admin/missions/{id}": {
      patch: { tags: ["Admin"], summary: "Atualizar missao", security: authSecurity, parameters: [idPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminMissionUpdateRequest" } } } }, responses: { "200": { description: "Missao atualizada" }, "400": { $ref: "#/components/responses/BadRequest" } } },
      delete: { tags: ["Admin"], summary: "Excluir missao", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Missao excluida" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/admin/trainings": {
      get: { tags: ["Admin"], summary: "Listar treinamentos", security: authSecurity, responses: { "200": { description: "Treinamentos retornados" } } },
      post: { tags: ["Admin"], summary: "Criar treinamento", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminTrainingRequest" } } } }, responses: { "201": { description: "Treinamento criado" } } },
    },
    "/api/v1/admin/trainings/{id}": {
      patch: { tags: ["Admin"], summary: "Atualizar treinamento", security: authSecurity, parameters: [idPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminTrainingUpdateRequest" } } } }, responses: { "200": { description: "Treinamento atualizado" }, "400": { $ref: "#/components/responses/BadRequest" } } },
      delete: { tags: ["Admin"], summary: "Excluir treinamento", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Treinamento excluido" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/admin/npcs": {
      get: { tags: ["Admin"], summary: "Listar NPCs", security: authSecurity, responses: { "200": { description: "NPCs retornados" } } },
      post: { tags: ["Admin"], summary: "Criar NPC", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminNpcRequest" } } } }, responses: { "201": { description: "NPC criado" } } },
    },
    "/api/v1/admin/npcs/{id}": {
      patch: { tags: ["Admin"], summary: "Atualizar NPC", security: authSecurity, parameters: [idPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminNpcUpdateRequest" } } } }, responses: { "200": { description: "NPC atualizado" }, "400": { $ref: "#/components/responses/BadRequest" } } },
      delete: { tags: ["Admin"], summary: "Excluir NPC", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "NPC excluido" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/admin/shop-products": {
      get: { tags: ["Admin"], summary: "Listar produtos da loja", security: authSecurity, responses: { "200": { description: "Produtos retornados" } } },
      post: { tags: ["Admin"], summary: "Criar produto da loja", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminShopProductRequest" } } } }, responses: { "201": { description: "Produto criado" }, "400": { $ref: "#/components/responses/BadRequest" } } },
    },
    "/api/v1/admin/shop-products/{id}": {
      patch: { tags: ["Admin"], summary: "Atualizar produto da loja", security: authSecurity, parameters: [idPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminShopProductUpdateRequest" } } } }, responses: { "200": { description: "Produto atualizado" }, "400": { $ref: "#/components/responses/BadRequest" }, "404": { $ref: "#/components/responses/NotFound" } } },
      delete: { tags: ["Admin"], summary: "Excluir produto da loja", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Produto excluido" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" } } },
    },
    "/api/v1/tables": {
      get: { tags: ["Tables"], summary: "Listar resumos das mesas do usuario", description: "Retorna DTOs leves sem a lista completa de membros ou o mundo completo.", security: authSecurity, responses: { "200": { description: "Resumos de mesas retornados" }, "401": { $ref: "#/components/responses/Unauthorized" } } },
      post: { tags: ["Tables"], summary: "Criar mesa RPG", description: "Cria a mesa, adiciona o criador como MASTER e gera evento automatico na timeline.", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTableRequest" } } } }, responses: { "201": { description: "Mesa criada" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/api/v1/tables/dashboard": {
      get: { tags: ["Tables"], summary: "Obter dashboard consolidado de mesas", description: "Retorna resumos limitados de mesas, reviews pendentes, missoes ativas e timeline em uma unica chamada.", security: authSecurity, responses: { "200": { description: "Dashboard retornado" }, "401": { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/api/v1/tables/join": {
      post: { tags: ["Tables"], summary: "Entrar em mesa por codigo", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/JoinTableRequest" } } } }, responses: { "200": { description: "Entrada realizada" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" } } },
    },
    "/api/v1/tables/{id}": {
      get: { tags: ["Tables"], summary: "Obter mesa", security: authSecurity, parameters: [idPathParam], responses: { "200": { description: "Mesa retornada" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/tables/{tableId}/master/overview": {
      get: { tags: ["Tables"], summary: "Obter overview consolidado do painel do Mestre", description: "Somente o MASTER ativo da mesa ou o usuario indicado por masterId. ADMIN global nao concede acesso.", security: authSecurity, parameters: [tableIdPathParam], responses: { "200": { description: "Overview retornado", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, overview: { $ref: "#/components/schemas/MasterOverviewResponse" } } } } } }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/tables/{tableId}/ai/world-summary": {
      post: { tags: ["Tables AI"], summary: "Sugerir rascunho do mundo", description: "Somente MASTER. Retorna sugestoes e nao salva dados.", security: authSecurity, parameters: [tableIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AiWorldSummaryRequest" } } } }, responses: { "200": { description: "Sugestao estruturada retornada" }, "400": { $ref: "#/components/responses/BadRequest" }, "403": { $ref: "#/components/responses/Forbidden" }, "503": { description: "AI assistant is not configured." } } },
    },
    "/api/v1/tables/{tableId}/ai/mission-ideas": {
      post: { tags: ["Tables AI"], summary: "Sugerir ideias de missao", description: "Somente MASTER. Retorna ate 3 ideias e nao salva dados.", security: authSecurity, parameters: [tableIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AiMissionIdeasRequest" } } } }, responses: { "200": { description: "Ideias estruturadas retornadas" }, "400": { $ref: "#/components/responses/BadRequest" }, "403": { $ref: "#/components/responses/Forbidden" }, "503": { description: "AI assistant is not configured." } } },
    },
    "/api/v1/tables/{tableId}/ai/traits": {
      post: { tags: ["Tables AI"], summary: "Sugerir traits de personagem", description: "Somente MASTER. O backend usa apenas contexto da mesa, personagem e traits existentes. Nao salva dados.", security: authSecurity, parameters: [tableIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AiTraitsRequest" } } } }, responses: { "200": { description: "Traits estruturadas retornadas" }, "400": { $ref: "#/components/responses/BadRequest" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "503": { description: "AI assistant is not configured." } } },
    },
    "/api/v1/tables/{tableId}/ai/timeline-summary": {
      post: { tags: ["Tables AI"], summary: "Sugerir resumo para timeline", description: "Somente MASTER. Retorna titulo e descricao sugeridos sem salvar dados.", security: authSecurity, parameters: [tableIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AiTimelineSummaryRequest" } } } }, responses: { "200": { description: "Resumo estruturado retornado" }, "400": { $ref: "#/components/responses/BadRequest" }, "403": { $ref: "#/components/responses/Forbidden" }, "503": { description: "AI assistant is not configured." } } },
    },
    "/api/v1/tables/{tableId}/world": {
      get: { tags: ["Tables"], summary: "Obter mundo da mesa", description: "Qualquer membro da mesa pode visualizar.", security: authSecurity, parameters: [tableIdPathParam], responses: { "200": { description: "Mundo retornado" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
      put: { tags: ["Tables"], summary: "Criar ou atualizar mundo da mesa", description: "Somente MASTER pode criar ou atualizar.", security: authSecurity, parameters: [tableIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableWorldRequest" } } } }, responses: { "200": { description: "Mundo salvo" }, "400": { $ref: "#/components/responses/BadRequest" }, "403": { $ref: "#/components/responses/Forbidden" } } },
    },
    "/api/v1/tables/{tableId}/characters": {
      get: { tags: ["Tables"], summary: "Listar personagens da mesa", security: authSecurity, parameters: [tableIdPathParam, { name: "reviewStatus", in: "query", required: false, schema: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED", "NEEDS_CHANGES"] } }, { name: "cursor", in: "query", required: false, schema: { type: "string" } }, { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } }], responses: { "200": { description: "Pagina de personagens retornada" }, "403": { $ref: "#/components/responses/Forbidden" } } },
      post: { tags: ["Tables"], summary: "Criar personagem na mesa", description: "Cria personagem vinculado a tableId e review PENDING.", security: authSecurity, parameters: [tableIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableCharacterRequest" } } } }, responses: { "201": { description: "Personagem enviado para revisao" }, "400": { $ref: "#/components/responses/BadRequest" }, "403": { $ref: "#/components/responses/Forbidden" } } },
    },
    "/api/v1/tables/{tableId}/characters/{characterId}/review": {
      patch: { tags: ["Tables"], summary: "Revisar personagem da mesa", description: "Somente MASTER. Ao aprovar, cria evento automatico CHARACTER_APPROVED na timeline.", security: authSecurity, parameters: [tableIdPathParam, characterIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableCharacterReviewRequest" } } } }, responses: { "200": { description: "Review atualizada" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/tables/{tableId}/characters/{characterId}/traits": {
      get: { tags: ["Tables"], summary: "Listar traits do personagem", security: authSecurity, parameters: [tableIdPathParam, characterIdPathParam, { name: "cursor", in: "query", required: false, schema: { type: "string" } }, { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } }], responses: { "200": { description: "Pagina de traits retornada" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
      post: { tags: ["Tables"], summary: "Criar trait do personagem", description: "Somente MASTER.", security: authSecurity, parameters: [tableIdPathParam, characterIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CharacterTraitRequest" } } } }, responses: { "201": { description: "Trait criada" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/tables/{tableId}/characters/{characterId}/traits/{traitId}": {
      delete: { tags: ["Tables"], summary: "Remover trait do personagem", description: "Somente MASTER.", security: authSecurity, parameters: [tableIdPathParam, characterIdPathParam, traitIdPathParam], responses: { "200": { description: "Trait removida" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/tables/{tableId}/missions": {
      get: { tags: ["Tables"], summary: "Listar missoes da mesa", security: authSecurity, parameters: [tableIdPathParam, { name: "status", in: "query", required: false, schema: { type: "string", enum: ["ACTIVE", "COMPLETED", "ARCHIVED"] } }, { name: "cursor", in: "query", required: false, schema: { type: "string" } }, { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } }], responses: { "200": { description: "Pagina de missoes retornada" }, "403": { $ref: "#/components/responses/Forbidden" } } },
      post: { tags: ["Tables"], summary: "Criar missao da mesa", description: "Somente MASTER. Cria evento automatico MISSION_CREATED na timeline.", security: authSecurity, parameters: [tableIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableMissionRequest" } } } }, responses: { "201": { description: "Missao criada" }, "403": { $ref: "#/components/responses/Forbidden" } } },
    },
    "/api/v1/tables/{tableId}/missions/{missionId}": {
      get: { tags: ["Tables"], summary: "Ver missao da mesa", description: "MASTER ve todas as submissions; PLAYER ve somente as proprias.", security: authSecurity, parameters: [tableIdPathParam, missionIdPathParam], responses: { "200": { description: "Missao retornada" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
      patch: { tags: ["Tables"], summary: "Atualizar missao da mesa", description: "Somente MASTER.", security: authSecurity, parameters: [tableIdPathParam, missionIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableMissionUpdateRequest" } } } }, responses: { "200": { description: "Missao atualizada" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/tables/{tableId}/missions/{missionId}/submissions": {
      get: { tags: ["Tables"], summary: "Listar submissions da missao", description: "MASTER ve todas; PLAYER ve somente as proprias.", security: authSecurity, parameters: [tableIdPathParam, missionIdPathParam], responses: { "200": { description: "Submissions retornadas" }, "403": { $ref: "#/components/responses/Forbidden" } } },
      post: { tags: ["Tables"], summary: "Enviar resposta de missao", description: "PLAYER precisa usar personagem aprovado da mesma mesa.", security: authSecurity, parameters: [tableIdPathParam, missionIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableMissionSubmissionRequest" } } } }, responses: { "201": { description: "Submission criada" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/tables/{tableId}/submissions": {
      get: { tags: ["Tables"], summary: "Listar submissions agregadas da mesa", description: "MASTER ve todas as submissions da mesa. PLAYER ve somente as proprias.", security: authSecurity, parameters: [tableIdPathParam, { name: "status", in: "query", required: false, schema: { type: "string", enum: ["SUBMITTED", "APPROVED", "REJECTED", "NEEDS_CHANGES"] } }, { name: "cursor", in: "query", required: false, schema: { type: "string" } }, { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } }], responses: { "200": { description: "Pagina de submissions retornada" }, "400": { $ref: "#/components/responses/BadRequest" }, "403": { $ref: "#/components/responses/Forbidden" } } },
    },
    "/api/v1/tables/{tableId}/submissions/me": {
      get: { tags: ["Tables"], summary: "Listar minhas submissions agregadas da mesa", description: "Retorna somente submissions do usuario autenticado na mesa.", security: authSecurity, parameters: [tableIdPathParam, { name: "status", in: "query", required: false, schema: { type: "string", enum: ["SUBMITTED", "APPROVED", "REJECTED", "NEEDS_CHANGES"] } }, { name: "cursor", in: "query", required: false, schema: { type: "string" } }, { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } }], responses: { "200": { description: "Pagina de submissions do usuario retornada" }, "400": { $ref: "#/components/responses/BadRequest" }, "403": { $ref: "#/components/responses/Forbidden" } } },
    },
    "/api/v1/tables/{tableId}/missions/{missionId}/submissions/{submissionId}/review": {
      patch: { tags: ["Tables"], summary: "Revisar submission da missao", description: "Somente MASTER. Ao aprovar, cria evento automatico MISSION_APPROVED na timeline.", security: authSecurity, parameters: [tableIdPathParam, missionIdPathParam, submissionIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableMissionSubmissionReviewRequest" } } } }, responses: { "200": { description: "Submission revisada" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/tables/{tableId}/timeline": {
      get: { tags: ["Tables"], summary: "Listar timeline da mesa", description: "Eventos paginados e ordenados por createdAt DESC.", security: authSecurity, parameters: [tableIdPathParam, { name: "cursor", in: "query", required: false, schema: { type: "string" } }, { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } }], responses: { "200": { description: "Pagina de eventos retornada" }, "403": { $ref: "#/components/responses/Forbidden" } } },
      post: { tags: ["Tables"], summary: "Criar evento manual de timeline", description: "Somente MASTER. Se characterId for enviado, ele deve pertencer a mesa.", security: authSecurity, parameters: [tableIdPathParam], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableTimelineEventRequest" } } } }, responses: { "201": { description: "Evento criado" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/rewards/claim": { post: { tags: ["Rewards"], summary: "Resgatar recompensa", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ClaimRewardRequest" } } } }, responses: { "201": { description: "Recompensa resgatada" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "409": { $ref: "#/components/responses/Conflict" } } } },
    "/api/v1/rewards/characters/{characterId}": { get: { tags: ["Rewards"], summary: "Listar rewards", security: authSecurity, parameters: [characterIdPathParam], responses: { "200": { description: "Claims retornadas" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } } } },
    "/api/v1/transactions/characters/{characterId}": { get: { tags: ["Transactions"], summary: "Historico de transacoes", security: authSecurity, parameters: [characterIdPathParam], responses: { "200": { description: "Historico retornado" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } } } },
    "/api/v1/shop/catalog": { get: { tags: ["Shop"], summary: "Listar catalogo da loja", responses: { "200": { description: "Catalogo retornado" } } } },
    "/api/v1/shop/market/characters/{characterId}": {
      get: {
        tags: ["Shop"],
        summary: "Obter overview do mercado do personagem",
        security: authSecurity,
        parameters: [characterIdPathParam],
        responses: {
          "200": { description: "Overview do mercado retornado" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/v1/shop/market/purchases": {
      post: {
        tags: ["Shop"],
        summary: "Comprar item ou equipamento no mercado com coins",
        security: authSecurity,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PurchaseRequest" } } } },
        responses: {
          "201": { description: "Compra de mercado realizada" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/v1/shop/market/sales": {
      post: {
        tags: ["Shop"],
        summary: "Vender item ou equipamento para o mercado",
        security: authSecurity,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MarketSaleRequest" } } } },
        responses: {
          "201": { description: "Venda para o mercado realizada" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/v1/shop/purchases": { post: { tags: ["Shop"], summary: "Comprar com moeda interna", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PurchaseRequest" } } } }, responses: { "201": { description: "Compra realizada" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "409": { $ref: "#/components/responses/Conflict" } } } },
    "/api/v1/shop/payment-orders": {
      get: { tags: ["Shop"], summary: "Listar pedidos de pagamento", security: authSecurity, responses: { "200": { description: "Pedidos retornados" }, "401": { $ref: "#/components/responses/Unauthorized" } } },
      post: { tags: ["Shop"], summary: "Criar pedido de pagamento", security: authSecurity, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentOrderRequest" } } } }, responses: { "201": { description: "Pedido criado" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/v1/shop/webhooks/payments": { post: { tags: ["Shop"], summary: "Processar webhook de pagamento", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentWebhookRequest" } } } }, responses: { "200": { description: "Webhook processado" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" } } } },
    "/api/v1/trades/characters/{characterId}": {
      get: {
        tags: ["Trades"],
        summary: "Listar trocas do personagem",
        security: authSecurity,
        parameters: [characterIdPathParam],
        responses: {
          "200": { description: "Trocas retornadas" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/v1/trades/requests": {
      post: {
        tags: ["Trades"],
        summary: "Criar solicitacao de troca",
        security: authSecurity,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTradeRequest" } } } },
        responses: {
          "201": { description: "Troca criada" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/v1/trades/{tradeId}/respond": {
      post: {
        tags: ["Trades"],
        summary: "Responder solicitacao de troca",
        security: authSecurity,
        parameters: [{ name: "tradeId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RespondTradeRequest" } } } },
        responses: {
          "200": { description: "Troca atualizada" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/v1/pvp/rankings": {
      get: {
        tags: ["PvP"],
        summary: "Obter ranking PvP",
        security: authSecurity,
        responses: {
          "200": { description: "Ranking PvP retornado" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/pvp/characters/{characterId}/overview": {
      get: {
        tags: ["PvP"],
        summary: "Obter overview PvP do personagem",
        security: authSecurity,
        parameters: [characterIdPathParam],
        responses: {
          "200": { description: "Overview PvP retornado" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/v1/pvp/matches": {
      post: {
        tags: ["PvP"],
        summary: "Executar duelo PvP",
        security: authSecurity,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePvpMatchRequest" } } } },
        responses: {
          "201": { description: "Duelo PvP concluido" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
  },
} as const;
