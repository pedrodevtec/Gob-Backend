import { GameplayDifficulty, PrismaClient, ShopProductAssetKind, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;

  if (adminEmail) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: UserRole.ADMIN },
      });
    }
  }

  const classes = [
    {
      name: "Warrior",
      modifier: "STR",
      description: "Especialista em combate corpo a corpo e alta resistencia.",
      passive: "Defesa reforcada em combates prolongados.",
    },
    {
      name: "Mage",
      modifier: "INT",
      description: "Manipula magia ofensiva e utilitaria com alto dano.",
      passive: "Regeneracao de mana fora de combate.",
    },
    {
      name: "Rogue",
      modifier: "DEX",
      description: "Alta mobilidade, furtividade e dano critico.",
      passive: "Chance elevada de esquiva.",
    },
  ];

  for (const characterClass of classes) {
    await prisma.class.upsert({
      where: { name: characterClass.name },
      update: characterClass,
      create: characterClass,
    });
  }

  const monsters = [
    {
      name: "Slime",
      level: 1,
      health: 35,
      attack: 8,
      defense: 3,
      experience: 20,
    },
    {
      name: "Goblin Scout",
      level: 3,
      health: 60,
      attack: 14,
      defense: 6,
      experience: 45,
    },
    {
      name: "Wolf Alpha",
      level: 5,
      health: 95,
      attack: 18,
      defense: 8,
      experience: 75,
    },
  ];

  const createdMonsters = [];

  for (const monster of monsters) {
    const existingMonster = await prisma.monster.findFirst({
      where: { name: monster.name },
    });

    const savedMonster = existingMonster
      ? await prisma.monster.update({
          where: { id: existingMonster.id },
          data: monster,
        })
      : await prisma.monster.create({
          data: monster,
        });

    createdMonsters.push(savedMonster);
  }

  const bounties = [
    {
      title: "Caçada ao Slime da Fronteira",
      description: "Elimine o slime que bloqueia a rota inicial.",
      monsterName: "Slime",
      recommendedLevel: 1,
      difficulty: GameplayDifficulty.EASY,
      reward: 25,
      rewardXp: 20,
      status: "OPEN",
      timeLimit: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
    {
      title: "Batedor Goblin Procurado",
      description: "Intercepte o batedor goblin antes que entregue informacoes.",
      monsterName: "Goblin Scout",
      recommendedLevel: 3,
      difficulty: GameplayDifficulty.MEDIUM,
      reward: 60,
      rewardXp: 45,
      status: "OPEN",
      timeLimit: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
    {
      title: "Alfa da Floresta Sombria",
      description: "Derrube o lobo alfa e proteja os comerciantes locais.",
      monsterName: "Wolf Alpha",
      recommendedLevel: 5,
      difficulty: GameplayDifficulty.HARD,
      reward: 120,
      rewardXp: 75,
      rewardItemName: "Presa do Alfa",
      rewardItemCategory: "monster_drop",
      rewardItemType: "wolf_fang",
      rewardItemImg: "/assets/items/wolf-fang.png",
      rewardItemEffect: "Trofeu de caca",
      rewardItemValue: 40,
      rewardItemQuantity: 1,
      status: "OPEN",
      timeLimit: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  ];

  for (const bounty of bounties) {
    const monster = createdMonsters.find((entry) => entry.name === bounty.monsterName);

    if (!monster) {
      continue;
    }

    const existingBounty = await prisma.bountyHunt.findFirst({
      where: {
        title: bounty.title,
      },
    });

    if (existingBounty) {
      await prisma.bountyHunt.update({
        where: { id: existingBounty.id },
        data: {
          title: bounty.title,
          description: bounty.description,
          monsterId: monster.id,
          recommendedLevel: bounty.recommendedLevel,
          difficulty: bounty.difficulty,
          reward: bounty.reward,
          rewardXp: bounty.rewardXp,
          rewardItemName: bounty.rewardItemName,
          rewardItemCategory: bounty.rewardItemCategory,
          rewardItemType: bounty.rewardItemType,
          rewardItemImg: bounty.rewardItemImg,
          rewardItemEffect: bounty.rewardItemEffect,
          rewardItemValue: bounty.rewardItemValue,
          rewardItemQuantity: bounty.rewardItemQuantity ?? 1,
          timeLimit: bounty.timeLimit,
          isActive: true,
          status: bounty.status,
        },
      });
    } else {
      await prisma.bountyHunt.create({
        data: {
          title: bounty.title,
          description: bounty.description,
          monsterId: monster.id,
          recommendedLevel: bounty.recommendedLevel,
          difficulty: bounty.difficulty,
          reward: bounty.reward,
          rewardXp: bounty.rewardXp,
          rewardItemName: bounty.rewardItemName,
          rewardItemCategory: bounty.rewardItemCategory,
          rewardItemType: bounty.rewardItemType,
          rewardItemImg: bounty.rewardItemImg,
          rewardItemEffect: bounty.rewardItemEffect,
          rewardItemValue: bounty.rewardItemValue,
          rewardItemQuantity: bounty.rewardItemQuantity ?? 1,
          status: bounty.status,
          timeLimit: bounty.timeLimit,
          isActive: true,
        },
      });
    }
  }

  const missions = [
    {
      title: "Patrulha da Estrada Velha",
      description: "Missao introdutoria para limpar a via principal.",
      difficulty: GameplayDifficulty.EASY,
      recommendedLevel: 1,
      enemyName: "Bandido Isolado",
      enemyLevel: 1,
      enemyHealth: 45,
      enemyAttack: 9,
      enemyDefense: 4,
      rewardXp: 30,
      rewardCoins: 18,
    },
    {
      title: "Ruinas do Vigia",
      description: "Confronto intermediario em uma area hostil.",
      difficulty: GameplayDifficulty.MEDIUM,
      recommendedLevel: 3,
      enemyName: "Guardiao das Ruinas",
      enemyLevel: 4,
      enemyHealth: 80,
      enemyAttack: 16,
      enemyDefense: 8,
      rewardXp: 70,
      rewardCoins: 40,
    },
    {
      title: "Cerco do Forte",
      description: "Missao avancada com premio de coleta.",
      difficulty: GameplayDifficulty.HARD,
      recommendedLevel: 5,
      enemyName: "Capitao Invasor",
      enemyLevel: 6,
      enemyHealth: 110,
      enemyAttack: 22,
      enemyDefense: 11,
      rewardXp: 120,
      rewardCoins: 75,
      rewardItemName: "Insignia do Forte",
      rewardItemCategory: "quest",
      rewardItemType: "fort_badge",
      rewardItemImg: "/assets/items/fort-badge.png",
      rewardItemEffect: "Comprovante de missao",
      rewardItemValue: 55,
      rewardItemQuantity: 1,
    },
  ];

  for (const mission of missions) {
    const existingMission = await prisma.missionDefinition.findFirst({
      where: { title: mission.title },
    });

    if (existingMission) {
      await prisma.missionDefinition.update({
        where: { id: existingMission.id },
        data: {
          ...mission,
          isActive: true,
          rewardItemQuantity: mission.rewardItemQuantity ?? 1,
        },
      });
    } else {
      await prisma.missionDefinition.create({
        data: {
          ...mission,
          isActive: true,
          rewardItemQuantity: mission.rewardItemQuantity ?? 1,
        },
      });
    }
  }

  const trainings = [
    {
      name: "Treino de Forca Basico",
      description: "Sessao curta para aumentar a eficiencia ofensiva.",
      trainingType: "strength",
      xpReward: 30,
      coinsReward: 5,
      cooldownSeconds: 3600,
    },
    {
      name: "Estudo Arcano Guiado",
      description: "Sessao de concentracao e leitura de grimorios.",
      trainingType: "intelligence",
      xpReward: 34,
      coinsReward: 5,
      cooldownSeconds: 3600,
    },
    {
      name: "Circuito de Agilidade",
      description: "Treino de movimentacao e reflexo.",
      trainingType: "dexterity",
      xpReward: 32,
      coinsReward: 6,
      cooldownSeconds: 3600,
    },
  ];

  for (const training of trainings) {
    const existingTraining = await prisma.trainingDefinition.findFirst({
      where: { name: training.name },
    });

    if (existingTraining) {
      await prisma.trainingDefinition.update({
        where: { id: existingTraining.id },
        data: {
          ...training,
          isActive: true,
        },
      });
    } else {
      await prisma.trainingDefinition.create({
        data: {
          ...training,
          isActive: true,
        },
      });
    }
  }

  const npcs = [
    {
      name: "Mestre Rowan",
      role: "mentor",
      interactionType: "mentor",
      description: "Instrutor de combate para aventureiros iniciantes.",
      dialogue: "Disciplina e repeticao vencem batalhas longas.",
      xpReward: 28,
      coinsReward: 0,
    },
    {
      name: "Selma Mercadora",
      role: "merchant",
      interactionType: "merchant",
      description: "Negociante de rotas e suprimentos.",
      dialogue: "Informacao certa sempre vale moedas.",
      xpReward: 0,
      coinsReward: 18,
    },
    {
      name: "Irmã Elise",
      role: "healer",
      interactionType: "healer",
      description: "Curandeira de campo que ajuda viajantes.",
      dialogue: "Leve este kit e volte inteiro.",
      xpReward: 12,
      coinsReward: 0,
      rewardItemName: "Pocao de Campo",
      rewardItemCategory: "consumable",
      rewardItemType: "field_supply",
      rewardItemImg: "/assets/items/field-potion.png",
      rewardItemEffect: "Suprimento de viagem",
      rewardItemValue: 20,
      rewardItemQuantity: 1,
    },
  ];

  for (const npc of npcs) {
    const existingNpc = await prisma.npcDefinition.findFirst({
      where: {
        name: npc.name,
        interactionType: npc.interactionType,
      },
    });

    if (existingNpc) {
      await prisma.npcDefinition.update({
        where: { id: existingNpc.id },
        data: {
          ...npc,
          isActive: true,
          rewardItemQuantity: npc.rewardItemQuantity ?? 1,
        },
      });
    } else {
      await prisma.npcDefinition.create({
        data: {
          ...npc,
          isActive: true,
          rewardItemQuantity: npc.rewardItemQuantity ?? 1,
        },
      });
    }
  }

  const products = [
    {
      slug: "small-health-potion",
      name: "Pocao Pequena de Vida",
      description: "Consumivel para recuperar vida.",
      category: "consumable",
      type: "healing",
      img: "/assets/items/potion-small.png",
      effect: "+50 HP",
      assetKind: ShopProductAssetKind.ITEM,
      price: 25,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "bronze-sword",
      name: "Espada de Bronze",
      description: "Arma basica para personagens iniciantes.",
      category: "weapon",
      type: "sword",
      img: "/assets/items/sword-bronze.png",
      effect: "+5 ATK",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 120,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "coin-pack-1000",
      name: "Pacote de 1000 Coins",
      description: "Credito premium para gastar na loja do jogo.",
      category: "currency",
      type: "coin_pack",
      img: "/assets/items/coin-pack-1000.png",
      effect: "1000 coins",
      assetKind: ShopProductAssetKind.COINS,
      price: 1990,
      rewardCoins: 1000,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
  ];

  for (const product of products) {
    await prisma.shopProduct.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
