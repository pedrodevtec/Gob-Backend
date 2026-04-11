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
    {
      slug: "tier-1-blade",
      name: "Lamina do Recruta",
      description: "Equipamento Tier 1 para quem esta entrando nos primeiros combates.",
      category: "weapon",
      type: "weapon",
      img: "/assets/items/tier-1-blade.png",
      effect: "+4 ATK",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 80,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-1-armor",
      name: "Armadura do Recruta",
      description: "Protecao Tier 1 com foco em sobrevivencia basica.",
      category: "armor",
      type: "armor",
      img: "/assets/items/tier-1-armor.png",
      effect: "+6 HP",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 75,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-1-charm",
      name: "Talisma do Recruta",
      description: "Acessorio Tier 1 para estabilizar a postura defensiva.",
      category: "accessory",
      type: "accessory",
      img: "/assets/items/tier-1-charm.png",
      effect: "+2 DEF",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 70,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-2-blade",
      name: "Lamina do Guarda",
      description: "Equipamento Tier 2 para patrulhas e cacas moderadas.",
      category: "weapon",
      type: "weapon",
      img: "/assets/items/tier-2-blade.png",
      effect: "+7 ATK",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 160,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-2-armor",
      name: "Armadura do Guarda",
      description: "Protecao Tier 2 para jornadas mais longas.",
      category: "armor",
      type: "armor",
      img: "/assets/items/tier-2-armor.png",
      effect: "+12 HP",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 150,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-2-charm",
      name: "Talisma do Guarda",
      description: "Acessorio Tier 2 que reforca a defesa no combate.",
      category: "accessory",
      type: "accessory",
      img: "/assets/items/tier-2-charm.png",
      effect: "+4 DEF",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 145,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-3-blade",
      name: "Lamina do Veterano",
      description: "Equipamento Tier 3 com dano consistente para missoes medias.",
      category: "weapon",
      type: "weapon",
      img: "/assets/items/tier-3-blade.png",
      effect: "+11 ATK",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 290,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-3-armor",
      name: "Armadura do Veterano",
      description: "Protecao Tier 3 para personagens que ja sustentam trocas longas.",
      category: "armor",
      type: "armor",
      img: "/assets/items/tier-3-armor.png",
      effect: "+20 HP",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 270,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-3-charm",
      name: "Talisma do Veterano",
      description: "Acessorio Tier 3 para consolidar uma linha de frente robusta.",
      category: "accessory",
      type: "accessory",
      img: "/assets/items/tier-3-charm.png",
      effect: "+6 DEF",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 260,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-4-blade",
      name: "Lamina do Campeao",
      description: "Equipamento Tier 4 para conteudo de alta pressao.",
      category: "weapon",
      type: "weapon",
      img: "/assets/items/tier-4-blade.png",
      effect: "+15 ATK",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 480,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-4-armor",
      name: "Armadura do Campeao",
      description: "Protecao Tier 4 para encontros de risco elevado.",
      category: "armor",
      type: "armor",
      img: "/assets/items/tier-4-armor.png",
      effect: "+30 HP",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 455,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-4-charm",
      name: "Talisma do Campeao",
      description: "Acessorio Tier 4 feito para lutas de elite.",
      category: "accessory",
      type: "accessory",
      img: "/assets/items/tier-4-charm.png",
      effect: "+9 DEF",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 430,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-5-blade",
      name: "Lamina do Soberano",
      description: "Equipamento Tier 5 para o topo da progressao.",
      category: "weapon",
      type: "weapon",
      img: "/assets/items/tier-5-blade.png",
      effect: "+20 ATK",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 760,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-5-armor",
      name: "Armadura do Soberano",
      description: "Protecao Tier 5 para suportar os encontros finais.",
      category: "armor",
      type: "armor",
      img: "/assets/items/tier-5-armor.png",
      effect: "+42 HP",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 720,
      rewardCoins: 0,
      rewardQuantity: 1,
      currency: "BRL",
      isActive: true,
    },
    {
      slug: "tier-5-charm",
      name: "Talisma do Soberano",
      description: "Acessorio Tier 5 para compor builds de fim de jogo.",
      category: "accessory",
      type: "accessory",
      img: "/assets/items/tier-5-charm.png",
      effect: "+12 DEF",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      price: 690,
      rewardCoins: 0,
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
