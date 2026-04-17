import {
  GameplayDifficulty,
  Prisma,
  PrismaClient,
  ShopProductAssetKind,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

type SeedNpc = {
  name: string;
  role: string;
  interactionType: string;
  imageUrl?: string;
  description?: string;
  dialogue?: string;
  xpReward?: number;
  coinsReward?: number;
  rewardItemName?: string;
  rewardItemCategory?: string;
  rewardItemType?: string;
  rewardItemImg?: string;
  rewardItemEffect?: string;
  rewardItemValue?: number;
  rewardItemQuantity?: number;
};

type SeedMission = {
  title: string;
  description?: string;
  difficulty: GameplayDifficulty;
  recommendedLevel: number;
  imageUrl?: string;
  startNpcName?: string;
  completionNpcName?: string;
  startDialogue?: string;
  completionDialogue?: string;
  repeatCooldownSeconds?: number;
  journey?: {
    startNodeId: string;
    nodes: Array<{
      id: string;
      type: "DIALOGUE" | "CHOICE" | "COMBAT" | "RETURN_TO_NPC" | "COMPLETE";
      title?: string;
      text?: string;
      nextNodeId?: string;
      npcId?: string;
      enemy?: {
        name: string;
        imageUrl?: string;
        level: number;
        health: number;
        attack: number;
        defense: number;
      };
      choices?: Array<{
        id: string;
        label: string;
        description?: string;
        nextNodeId: string;
      }>;
    }>;
  };
  enemyName: string;
  enemyLevel: number;
  enemyHealth: number;
  enemyAttack: number;
  enemyDefense: number;
  rewardXp: number;
  rewardCoins: number;
  rewardItemName?: string;
  rewardItemCategory?: string;
  rewardItemType?: string;
  rewardItemImg?: string;
  rewardItemEffect?: string;
  rewardItemValue?: number;
  rewardItemQuantity?: number;
};

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
    tier: 1,
    evolvesFrom: null,
    modifier: "STR",
    description: "Especialista em combate corpo a corpo com foco em estabilidade, defesa e presença de linha de frente.",
    passive: "Postura de Guerra: +6% DEF total e +4% HP maximo.",
  },
  {
    name: "Berserker",
    tier: 2,
    evolvesFrom: "Warrior",
    modifier: "STR",
    description: "Combatente brutal focado em pressão ofensiva constante, sacrificando parte da segurança por dano.",
    passive: "Furia Sanguinea: +12% ATK total e -6% DEF total.",
  },
  {
    name: "Warlord",
    tier: 3,
    evolvesFrom: "Berserker",
    modifier: "STR",
    description: "Veterano de guerra devastador que lidera pelo poder bruto e domina o campo com agressividade extrema.",
    passive: "Dominio da Carnificina: +18% ATK total, +8% crit chance e -8% DEF total.",
  },

  {
    name: "Paladin",
    tier: 2,
    evolvesFrom: "Warrior",
    modifier: "STR",
    description: "Guardiao sagrado de alta resistencia, excelente para sustentar lutas longas e proteger aliados.",
    passive: "Aura de Devocao: +10% HP maximo e +8% DEF total.",
  },
  {
    name: "Templar",
    tier: 3,
    evolvesFrom: "Paladin",
    modifier: "STR",
    description: "Campeao sagrado de defesa suprema, capaz de resistir a grandes ameaças enquanto mantém presença ofensiva moderada.",
    passive: "Julgamento Sagrado: +14% DEF total, +12% HP maximo e +6% ATK total.",
  },

  {
    name: "Knight",
    tier: 2,
    evolvesFrom: "Warrior",
    modifier: "STR",
    description: "Guerreiro disciplinado e equilibrado, especializado em consistencia defensiva e controle do combate.",
    passive: "Armadura de Aco: +8% DEF total e +6% ATK total.",
  },
  {
    name: "Champion",
    tier: 3,
    evolvesFrom: "Knight",
    modifier: "STR",
    description: "Lutador supremo de batalha justa, combinando força, resistencia e constancia em alto nivel.",
    passive: "Gloria do Campeao: +10% ATK total, +10% DEF total e +8% HP maximo.",
  },

  {
    name: "Mage",
    tier: 1,
    evolvesFrom: null,
    modifier: "INT",
    description: "Conjurador ofensivo que canaliza energia arcana para causar dano a media e longa distancia.",
    passive: "Fluxo Arcano: +10% ATK total.",
  },
  {
    name: "Sorcerer",
    tier: 2,
    evolvesFrom: "Mage",
    modifier: "INT",
    description: "Especialista em rajadas instaveis e explosões de poder com alta chance de dano critico.",
    passive: "Sobrecarga Mistica: +10% ATK total e +5% crit chance.",
  },
  {
    name: "Archmage",
    tier: 3,
    evolvesFrom: "Sorcerer",
    modifier: "INT",
    description: "Mestre absoluto das artes arcanas, capaz de liberar magia devastadora com refinamento e precisão.",
    passive: "Supremacia Arcana: +18% ATK total e +10% crit chance.",
  },

  {
    name: "Cleric",
    tier: 2,
    evolvesFrom: "Mage",
    modifier: "INT",
    description: "Conjurador de suporte e sustentacao, capaz de resistir melhor enquanto fortalece sua presença em combate.",
    passive: "Bencao de Vigilia: +8% HP maximo e +8% DEF total.",
  },
  {
    name: "High Priest",
    tier: 3,
    evolvesFrom: "Cleric",
    modifier: "INT",
    description: "Sumo sacerdote que une poder espiritual e resistencia, sendo referência de sobrevivencia e suporte magico.",
    passive: "Graca Divina: +12% HP maximo, +12% DEF total e +6% ATK total.",
  },

  {
    name: "Warlock",
    tier: 2,
    evolvesFrom: "Mage",
    modifier: "INT",
    description: "Usuário de magia proibida que troca vitalidade por poder ofensivo persistente.",
    passive: "Pacto Profano: +14% ATK total e -5% HP maximo.",
  },
  {
    name: "Necromancer",
    tier: 3,
    evolvesFrom: "Warlock",
    modifier: "INT",
    description: "Mestre das artes sombrias que converte sacrificio e energia corrompida em imenso poder destrutivo.",
    passive: "Selo da Morte: +20% ATK total, +6% crit chance e -8% HP maximo.",
  },

  {
    name: "Rogue",
    tier: 1,
    evolvesFrom: null,
    modifier: "DEX",
    description: "Especialista em mobilidade, oportunismo e execucao rapida, com foco em precisão e ritmo.",
    passive: "Passos Sombrios: +6% ATK total e +4% crit chance.",
  },
  {
    name: "Ranger",
    tier: 2,
    evolvesFrom: "Rogue",
    modifier: "DEX",
    description: "Combatente versatil com foco em pressão constante, alcance e sobrevivencia tatica.",
    passive: "Instinto de Caca: +8% ATK total e +6% HP maximo.",
  },
  {
    name: "Hunter",
    tier: 3,
    evolvesFrom: "Ranger",
    modifier: "DEX",
    description: "Predador de elite que combina precisao, constancia e eficiencia para dominar confrontos prolongados.",
    passive: "Marca do Predador: +12% ATK total, +8% crit chance e +8% HP maximo.",
  },

  {
    name: "Assassin",
    tier: 2,
    evolvesFrom: "Rogue",
    modifier: "DEX",
    description: "Executor letal voltado para burst alto e eliminações explosivas, com menor margem para erro.",
    passive: "Golpe Fatal: +10% ATK total, +8% crit chance e -6% HP maximo.",
  },
  {
    name: "Shadowblade",
    tier: 3,
    evolvesFrom: "Assassin",
    modifier: "DEX",
    description: "Carrasco das sombras especializado em eliminar inimigos com velocidade absurda e golpes criticos letais.",
    passive: "Execucao Sombria: +16% ATK total, +14% crit chance e -8% HP maximo.",
  },

  {
    name: "Duelist",
    tier: 2,
    evolvesFrom: "Rogue",
    modifier: "DEX",
    description: "Especialista em precisão e combate tecnico, equilibrando dano consistente com alta capacidade de resposta.",
    passive: "Tecnica Impecavel: +7% ATK total, +6% crit chance e +4% DEF total.",
  },
  {
    name: "Blademaster",
    tier: 3,
    evolvesFrom: "Duelist",
    modifier: "DEX",
    description: "Mestre da lâmina que une refinamento tecnico, velocidade e consistencia em um estilo mortalmente elegante.",
    passive: "Danca das Laminas: +12% ATK total, +10% crit chance e +6% DEF total.",
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
    {
      name: "Cavaleiro Corrompido",
      level: 15,
      health: 260,
      attack: 42,
      defense: 19,
      experience: 280,
    },
    {
      name: "Drake de Obsidiana",
      level: 30,
      health: 620,
      attack: 86,
      defense: 37,
      experience: 760,
    },
    {
      name: "Avatar do Despertar",
      level: 30,
      health: 540,
      attack: 90,
      defense: 40,
      experience: 920,
    },
    {
      name: "Titã do Vazio",
      level: 50,
      health: 1280,
      attack: 150,
      defense: 66,
      experience: 1650,
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
    {
      title: "Queda do Cavaleiro Corrompido",
      description: "Derrube o guardiao amaldiçoado que protege a muralha antiga.",
      monsterName: "Cavaleiro Corrompido",
      recommendedLevel: 15,
      difficulty: GameplayDifficulty.HARD,
      reward: 520,
      rewardXp: 340,
      rewardItemName: "Nucleo Corrompido",
      rewardItemCategory: "monster_drop",
      rewardItemType: "corrupted_core",
      rewardItemImg: "/assets/items/corrupted-core.png",
      rewardItemEffect: "Fragmento de energia sombria",
      rewardItemValue: 180,
      rewardItemQuantity: 1,
      status: "OPEN",
      timeLimit: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
    {
      title: "Caca ao Drake de Obsidiana",
      description: "Interrompa a rota de destruição do drake antes que ele alcance a fortaleza.",
      monsterName: "Drake de Obsidiana",
      recommendedLevel: 30,
      difficulty: GameplayDifficulty.ELITE,
      reward: 1480,
      rewardXp: 980,
      rewardItemName: "Escama de Obsidiana",
      rewardItemCategory: "monster_drop",
      rewardItemType: "obsidian_scale",
      rewardItemImg: "/assets/items/obsidian-scale.png",
      rewardItemEffect: "Material raro de forja pesada",
      rewardItemValue: 420,
      rewardItemQuantity: 1,
      status: "OPEN",
      timeLimit: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
    {
      title: "Execucao do Titã do Vazio",
      description: "Mobilize a ofensiva final para abater a criatura que distorce o campo de batalha.",
      monsterName: "Titã do Vazio",
      recommendedLevel: 50,
      difficulty: GameplayDifficulty.ELITE,
      reward: 4200,
      rewardXp: 2600,
      rewardItemName: "Fragmento do Vazio",
      rewardItemCategory: "monster_drop",
      rewardItemType: "void_fragment",
      rewardItemImg: "/assets/items/void-fragment.png",
      rewardItemEffect: "Residuo de uma entidade colossal",
      rewardItemValue: 1200,
      rewardItemQuantity: 1,
      status: "OPEN",
      timeLimit: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
    },
    {
      title: "Awaken",
      description: "Derrote o Avatar do Despertar para conquistar o emblema necessario para evoluir sua classe base.",
      monsterName: "Avatar do Despertar",
      recommendedLevel: 30,
      difficulty: GameplayDifficulty.ELITE,
      reward: 1800,
      rewardXp: 1200,
      rewardItemName: "Emblema do Despertar",
      rewardItemCategory: "special",
      rewardItemType: "awakening_token",
      rewardItemImg: "/assets/items/awakening-emblem.png",
      rewardItemEffect: "Catalisador usado no awaken de classe",
      rewardItemValue: 0,
      rewardItemQuantity: 1,
      status: "OPEN",
      timeLimit: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
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

  const missions: SeedMission[] = [
  // =========================
  // EARLY GAME | LV 1 - 20
  // =========================
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
    title: "Lobos na Colina Seca",
    description: "Afaste as feras que estao bloqueando a passagem dos viajantes.",
    difficulty: GameplayDifficulty.EASY,
    recommendedLevel: 3,
    enemyName: "Lobo Alfa Magro",
    enemyLevel: 3,
    enemyHealth: 62,
    enemyAttack: 12,
    enemyDefense: 5,
    rewardXp: 48,
    rewardCoins: 28,
  },
  {
    title: "Ruinas do Vigia",
    description: "Confronto intermediario em uma area hostil.",
    difficulty: GameplayDifficulty.MEDIUM,
    recommendedLevel: 5,
    enemyName: "Guardiao das Ruinas",
    enemyLevel: 6,
    enemyHealth: 86,
    enemyAttack: 16,
    enemyDefense: 8,
    rewardXp: 74,
    rewardCoins: 42,
  },
  {
    title: "Covil da Fenda Baixa",
    description: "Investigue o covil e elimine a criatura que lidera a matilha local.",
    difficulty: GameplayDifficulty.MEDIUM,
    recommendedLevel: 7,
    enemyName: "Predador da Fenda",
    enemyLevel: 8,
    enemyHealth: 110,
    enemyAttack: 20,
    enemyDefense: 9,
    rewardXp: 96,
    rewardCoins: 56,
  },
  {
    title: "Cerco do Forte",
    description: "Missao avancada com premio de coleta.",
    difficulty: GameplayDifficulty.HARD,
    recommendedLevel: 10,
    enemyName: "Capitao Invasor",
    enemyLevel: 11,
    enemyHealth: 145,
    enemyAttack: 25,
    enemyDefense: 12,
    rewardXp: 130,
    rewardCoins: 80,
    rewardItemName: "Insignia do Forte",
    rewardItemCategory: "quest",
    rewardItemType: "fort_badge",
    rewardItemImg: "/assets/items/fort-badge.png",
    rewardItemEffect: "Comprovante de missao",
    rewardItemValue: 55,
    rewardItemQuantity: 1,
  },
  {
    title: "Bosque dos Espinhos Partidos",
    description: "Abra passagem pelo bosque e derrote o guardiao corrompido da trilha.",
    difficulty: GameplayDifficulty.HARD,
    recommendedLevel: 12,
    enemyName: "Ent Espinhento",
    enemyLevel: 13,
    enemyHealth: 182,
    enemyAttack: 30,
    enemyDefense: 14,
    rewardXp: 168,
    rewardCoins: 105,
  },
  {
    title: "Passagem da Lua Turva",
    description: "Recupere o controle da passagem tomada por saqueadores experientes.",
    difficulty: GameplayDifficulty.HARD,
    recommendedLevel: 15,
    enemyName: "Mestre Saqueador",
    enemyLevel: 16,
    enemyHealth: 225,
    enemyAttack: 36,
    enemyDefense: 17,
    rewardXp: 215,
    rewardCoins: 135,
  },
  {
    title: "Torre do Juramento Quebrado",
    description: "Suba a torre abandonada e enfrente o antigo defensor que enlouqueceu.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 18,
    enemyName: "Cavaleiro Juramentado",
    enemyLevel: 20,
    enemyHealth: 278,
    enemyAttack: 43,
    enemyDefense: 20,
    rewardXp: 280,
    rewardCoins: 180,
    rewardItemName: "Medalhao Juramentado",
    rewardItemCategory: "quest",
    rewardItemType: "oath_medallion",
    rewardItemImg: "/assets/items/oath-medallion.png",
    rewardItemEffect: "Marca de uma batalha vencida",
    rewardItemValue: 90,
    rewardItemQuantity: 1,
  },

  // =========================
  // TRANSICAO | LV 20 - 25
  // =========================
  {
    title: "Assalto ao Arsenal Quebrado",
    description: "Recupere o posto avançado tomado por veteranos renegados.",
    difficulty: GameplayDifficulty.HARD,
    recommendedLevel: 20,
    enemyName: "Capitao da Ruina",
    enemyLevel: 22,
    enemyHealth: 320,
    enemyAttack: 52,
    enemyDefense: 24,
    rewardXp: 420,
    rewardCoins: 260,
    rewardItemName: "Selo do Arsenal",
    rewardItemCategory: "quest",
    rewardItemType: "arsenal_seal",
    rewardItemImg: "/assets/items/arsenal-seal.png",
    rewardItemEffect: "Prova de conquista militar",
    rewardItemValue: 160,
    rewardItemQuantity: 1,
  },
  {
    title: "Forja Tomada",
    description: "Retome a forja ocupada por mercenarios e recupere os moldes perdidos.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 24,
    enemyName: "Ferreiro Renegado",
    enemyLevel: 25,
    enemyHealth: 370,
    enemyAttack: 58,
    enemyDefense: 27,
    rewardXp: 520,
    rewardCoins: 340,
    rewardItemName: "Molde de Aco Pesado",
    rewardItemCategory: "quest",
    rewardItemType: "heavy_steel_mold",
    rewardItemImg: "/assets/items/heavy-steel-mold.png",
    rewardItemEffect: "Componente de forja rara",
    rewardItemValue: 220,
    rewardItemQuantity: 1,
  },

  // =========================
  // MID GAME | LV 25 - 40
  // =========================
  {
    title: "Investida no Vale de Ferro",
    description: "Elimine a guarnicao inimiga instalada nas minas externas.",
    difficulty: GameplayDifficulty.MEDIUM,
    recommendedLevel: 25,
    enemyName: "Soldado de Ferro",
    enemyLevel: 26,
    enemyHealth: 410,
    enemyAttack: 63,
    enemyDefense: 29,
    rewardXp: 560,
    rewardCoins: 420,
  },
  {
    title: "Eco do Santuário Caido",
    description: "Vença o eco espiritual que domina o antigo santuario esquecido.",
    difficulty: GameplayDifficulty.HARD,
    recommendedLevel: 28,
    enemyName: "Eco do Abade",
    enemyLevel: 29,
    enemyHealth: 470,
    enemyAttack: 71,
    enemyDefense: 32,
    rewardXp: 650,
    rewardCoins: 520,
  },
  {
    title: "Ruptura do Bastiao Rubro",
    description: "Abra caminho pelo bastiao incendiado e neutralize a guarnicao de elite.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 30,
    enemyName: "General Rubro",
    enemyLevel: 32,
    enemyHealth: 560,
    enemyAttack: 88,
    enemyDefense: 38,
    rewardXp: 960,
    rewardCoins: 620,
    rewardItemName: "Insignia Rubra",
    rewardItemCategory: "quest",
    rewardItemType: "crimson_insignia",
    rewardItemImg: "/assets/items/crimson-insignia.png",
    rewardItemEffect: "Marca de comando conquistada em batalha",
    rewardItemValue: 420,
    rewardItemQuantity: 1,
  },
  {
    title: "Corredor das Laminas Quietas",
    description: "Atravesse o corredor guardado por assassinos e derrote seu comandante.",
    difficulty: GameplayDifficulty.HARD,
    recommendedLevel: 32,
    enemyName: "Mestre das Laminas",
    enemyLevel: 33,
    enemyHealth: 620,
    enemyAttack: 94,
    enemyDefense: 40,
    rewardXp: 1020,
    rewardCoins: 760,
  },
  {
    title: "Profundezas do Poço Sombrio",
    description: "Desca ao poço proibido e enfrente a criatura que emerge da escuridao.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 35,
    enemyName: "Aberracao do Poço",
    enemyLevel: 36,
    enemyHealth: 720,
    enemyAttack: 104,
    enemyDefense: 45,
    rewardXp: 1180,
    rewardCoins: 940,
    rewardItemName: "Olho do Poço",
    rewardItemCategory: "quest",
    rewardItemType: "abyss_eye",
    rewardItemImg: "/assets/items/abyss-eye.png",
    rewardItemEffect: "Trofeu sombrio de criatura abissal",
    rewardItemValue: 520,
    rewardItemQuantity: 1,
  },
  {
    title: "Muralha do Sol Partido",
    description: "Recupere a muralha e derrote o guerreiro que lidera o cerco dourado.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 38,
    enemyName: "Executor Solar",
    enemyLevel: 39,
    enemyHealth: 810,
    enemyAttack: 116,
    enemyDefense: 49,
    rewardXp: 1340,
    rewardCoins: 1120,
  },
  {
    title: "Trono das Cinzas Eternas",
    description: "Enfrente o soberano das cinzas no interior da fortaleza devastada.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 40,
    enemyName: "Rei das Cinzas",
    enemyLevel: 42,
    enemyHealth: 880,
    enemyAttack: 126,
    enemyDefense: 54,
    rewardXp: 1680,
    rewardCoins: 1100,
    rewardItemName: "Coroa Carbonizada",
    rewardItemCategory: "quest",
    rewardItemType: "ashen_crown",
    rewardItemImg: "/assets/items/ashen-crown.png",
    rewardItemEffect: "Trofeu da campanha final",
    rewardItemValue: 760,
    rewardItemQuantity: 1,
  },

  // =========================
  // END GAME | LV 45 - 60
  // Gold ajuda, mas o foco passa a ser bounty material
  // =========================
  {
    title: "Caca do Colosso Caido",
    description: "Derrote o colosso antigo e recupere fragmentos do seu nucleo.",
    difficulty: GameplayDifficulty.HARD,
    recommendedLevel: 45,
    enemyName: "Colosso Fraturado",
    enemyLevel: 46,
    enemyHealth: 1020,
    enemyAttack: 138,
    enemyDefense: 60,
    rewardXp: 1900,
    rewardCoins: 1200,
    rewardItemName: "Nucleo de Bounty Lv45",
    rewardItemCategory: "quest",
    rewardItemType: "bounty_core_45",
    rewardItemImg: "/assets/items/bounty-core-45.png",
    rewardItemEffect: "Material de craft de endgame",
    rewardItemValue: 1,
    rewardItemQuantity: 2,
  },
  {
    title: "Santuario da Lua Vazia",
    description: "Purifique o santuario dominado por uma entidade lunar corrompida.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 47,
    enemyName: "Arauto da Lua Vazia",
    enemyLevel: 48,
    enemyHealth: 1120,
    enemyAttack: 148,
    enemyDefense: 64,
    rewardXp: 2100,
    rewardCoins: 1320,
    rewardItemName: "Fragmento Obscuro",
    rewardItemCategory: "quest",
    rewardItemType: "dark_fragment",
    rewardItemImg: "/assets/items/dark-fragment.png",
    rewardItemEffect: "Fragmento raro usado em forja avancada",
    rewardItemValue: 1,
    rewardItemQuantity: 3,
  },
  {
    title: "Bounty do Abismo Voraz",
    description: "Aceite o contrato para caçar a criatura alfa das profundezas.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 50,
    enemyName: "Devorador Abissal",
    enemyLevel: 51,
    enemyHealth: 1260,
    enemyAttack: 162,
    enemyDefense: 70,
    rewardXp: 2360,
    rewardCoins: 1450,
    rewardItemName: "Essencia de Bounty Lv50",
    rewardItemCategory: "quest",
    rewardItemType: "bounty_essence_50",
    rewardItemImg: "/assets/items/bounty-essence-50.png",
    rewardItemEffect: "Essencia rara de bounty",
    rewardItemValue: 1,
    rewardItemQuantity: 2,
  },
  {
    title: "Ruina do Vigia Celestial",
    description: "Derrote o guardiao caido que protege os restos da fortaleza astral.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 52,
    enemyName: "Vigia Celestial Caido",
    enemyLevel: 53,
    enemyHealth: 1360,
    enemyAttack: 172,
    enemyDefense: 74,
    rewardXp: 2520,
    rewardCoins: 1580,
    rewardItemName: "Olho Astral",
    rewardItemCategory: "quest",
    rewardItemType: "astral_eye",
    rewardItemImg: "/assets/items/astral-eye.png",
    rewardItemEffect: "Componente astral de alta raridade",
    rewardItemValue: 1,
    rewardItemQuantity: 2,
  },
  {
    title: "Marcha do Soberano Perdido",
    description: "Interrompa a marcha do antigo rei de guerra antes que ele alcance a capital.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 55,
    enemyName: "Soberano Perdido",
    enemyLevel: 56,
    enemyHealth: 1500,
    enemyAttack: 188,
    enemyDefense: 80,
    rewardXp: 2860,
    rewardCoins: 1760,
    rewardItemName: "Essencia de Bounty Lv55",
    rewardItemCategory: "quest",
    rewardItemType: "bounty_essence_55",
    rewardItemImg: "/assets/items/bounty-essence-55.png",
    rewardItemEffect: "Essencia ancestral para equipamentos superiores",
    rewardItemValue: 1,
    rewardItemQuantity: 2,
  },
  {
    title: "Fenda do Eclipse Final",
    description: "Sobreviva a fenda terminal e enfrente a entidade que consome o horizonte.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 58,
    enemyName: "Arauto do Eclipse",
    enemyLevel: 59,
    enemyHealth: 1660,
    enemyAttack: 202,
    enemyDefense: 86,
    rewardXp: 3180,
    rewardCoins: 1940,
    rewardItemName: "Fragmento do Vazio",
    rewardItemCategory: "quest",
    rewardItemType: "void_fragment",
    rewardItemImg: "/assets/items/void-fragment.png",
    rewardItemEffect: "Fragmento final para equipamentos do topo",
    rewardItemValue: 1,
    rewardItemQuantity: 3,
  },
  {
    title: "Trono do Vazio Ancestral",
    description: "Enfrente o senhor final do vazio e prove seu dominio sobre o endgame.",
    difficulty: GameplayDifficulty.ELITE,
    recommendedLevel: 60,
    enemyName: "Rei do Vazio Ancestral",
    enemyLevel: 62,
    enemyHealth: 1850,
    enemyAttack: 220,
    enemyDefense: 94,
    rewardXp: 3600,
    rewardCoins: 2200,
    rewardItemName: "Coracao Ancestral",
    rewardItemCategory: "quest",
    rewardItemType: "ancient_heart",
    rewardItemImg: "/assets/items/ancient-heart.png",
    rewardItemEffect: "Catalisador maximo de craft do jogo",
    rewardItemValue: 1,
    rewardItemQuantity: 1,
  },
  {
    title: "Chamado do Piquete",
    description: "Primeira patrulha nas cercanias do posto para treinar reconhecimento e resposta rapida.",
    difficulty: GameplayDifficulty.EASY,
    recommendedLevel: 1,
    imageUrl: "/assets/missions/picket-call.png",
    startNpcName: "Mestre Rowan",
    completionNpcName: "Capita Mira",
    startDialogue: "Mestre Rowan quer ver se voce aguenta uma patrulha real sem perder o foco.",
    completionDialogue: "Servico simples, mas bem executado. Continue assim.",
    repeatCooldownSeconds: 600,
    journey: {
      startNodeId: "rowan-briefing",
      nodes: [
        {
          id: "rowan-briefing",
          type: "DIALOGUE",
          title: "Patrulha inicial",
          text: "Rowan manda voce verificar um piquete que deixou de responder ao posto avancado.",
          nextNodeId: "trail-choice",
        },
        {
          id: "trail-choice",
          type: "CHOICE",
          title: "Como procurar",
          text: "Voce pode seguir marcas recentes no barro ou inspecionar as carrocas abandonadas na estrada.",
          choices: [
            {
              id: "mud-tracks",
              label: "Seguir as marcas no barro",
              description: "Chega mais rapido ao agressor.",
              nextNodeId: "quick-scout",
            },
            {
              id: "inspect-carts",
              label: "Inspecionar as carrocas",
              description: "Busca pistas antes de avancar.",
              nextNodeId: "cart-scout",
            },
          ],
        },
        {
          id: "quick-scout",
          type: "DIALOGUE",
          text: "As pegadas levam a um salteador escondido atras da mureta do caminho.",
          nextNodeId: "picket-combat",
        },
        {
          id: "cart-scout",
          type: "DIALOGUE",
          text: "Entre caixotes quebrados voce encontra um emblema roubado do piquete e localiza o agressor.",
          nextNodeId: "picket-combat",
        },
        {
          id: "picket-combat",
          type: "COMBAT",
          title: "Salteador do acostamento",
          text: "Derrote o invasor e recupere o sinal do piquete.",
          enemy: {
            name: "Salteador do Acostamento",
            imageUrl: "/assets/enemies/roadside-raider.png",
            level: 1,
            health: 40,
            attack: 8,
            defense: 3,
          },
          nextNodeId: "picket-turn-in",
        },
        {
          id: "picket-turn-in",
          type: "RETURN_TO_NPC",
          text: "Leve o sinal recuperado para a Capita Mira.",
          npcId: "completion-npc-placeholder",
          nextNodeId: "picket-complete",
        },
        {
          id: "picket-complete",
          type: "COMPLETE",
          text: "O posto confirma a patrulha e registra sua primeira resposta de campo.",
        },
      ],
    },
    enemyName: "Salteador do Acostamento",
    enemyLevel: 1,
    enemyHealth: 40,
    enemyAttack: 8,
    enemyDefense: 3,
    rewardXp: 28,
    rewardCoins: 16,
    rewardItemName: "Sinal do Piquete",
    rewardItemCategory: "quest",
    rewardItemType: "picket_token",
    rewardItemImg: "/assets/items/picket-token.png",
    rewardItemEffect: "Identificacao recuperada de um destacamento local",
    rewardItemValue: 12,
    rewardItemQuantity: 1,
  },
  {
    title: "Remedios para a Enfermaria",
    description: "Escolta curta para recuperar caixas de ervas roubadas perto da estrada.",
    difficulty: GameplayDifficulty.EASY,
    recommendedLevel: 2,
    imageUrl: "/assets/missions/infirmary-herbs.png",
    startNpcName: "Irmã Elise",
    completionNpcName: "Irmã Elise",
    startDialogue: "A enfermaria ficou sem suprimentos depois de um saque na madrugada.",
    completionDialogue: "Essas ervas vao manter metade do posto de pe esta noite.",
    repeatCooldownSeconds: 720,
    journey: {
      startNodeId: "herb-briefing",
      nodes: [
        {
          id: "herb-briefing",
          type: "DIALOGUE",
          title: "Pedido urgente",
          text: "Irma Elise explica que as caixas foram arrastadas para o bosque baixo ao norte.",
          nextNodeId: "herb-choice",
        },
        {
          id: "herb-choice",
          type: "CHOICE",
          title: "Onde procurar primeiro",
          text: "Voce pode subir pela trilha seca ou cortar pelo riacho raso para chegar mais perto do esconderijo.",
          choices: [
            {
              id: "dry-path",
              label: "Usar a trilha seca",
              description: "Mais segura, porem mais longa.",
              nextNodeId: "dry-path-dialogue",
            },
            {
              id: "shallow-creek",
              label: "Cortar pelo riacho",
              description: "Mais rapida, com chance maior de ser visto.",
              nextNodeId: "creek-dialogue",
            },
          ],
        },
        {
          id: "dry-path-dialogue",
          type: "DIALOGUE",
          text: "Pela trilha voce encontra rastros de arrasto e confirma onde a carga foi escondida.",
          nextNodeId: "herb-combat",
        },
        {
          id: "creek-dialogue",
          type: "DIALOGUE",
          text: "A agua abafa seus passos, mas um saqueador percebe sua aproximacao quando voce sai na clareira.",
          nextNodeId: "herb-combat",
        },
        {
          id: "herb-combat",
          type: "COMBAT",
          title: "Ladrao de suprimentos",
          text: "Derrote o saqueador que protege as caixas da enfermaria.",
          enemy: {
            name: "Ladrao de Suprimentos",
            imageUrl: "/assets/enemies/supply-thief.png",
            level: 2,
            health: 52,
            attack: 10,
            defense: 4,
          },
          nextNodeId: "herb-turn-in",
        },
        {
          id: "herb-turn-in",
          type: "RETURN_TO_NPC",
          text: "Retorne a Irma Elise com as caixas recuperadas.",
          npcId: "completion-npc-placeholder",
          nextNodeId: "herb-complete",
        },
        {
          id: "herb-complete",
          type: "COMPLETE",
          text: "A enfermaria recebe os remedios e volta a operar normalmente.",
        },
      ],
    },
    enemyName: "Ladrao de Suprimentos",
    enemyLevel: 2,
    enemyHealth: 52,
    enemyAttack: 10,
    enemyDefense: 4,
    rewardXp: 36,
    rewardCoins: 20,
    rewardItemName: "Caixa de Ervas Selada",
    rewardItemCategory: "quest",
    rewardItemType: "sealed_herb_crate",
    rewardItemImg: "/assets/items/sealed-herb-crate.png",
    rewardItemEffect: "Suprimento medico recuperado",
    rewardItemValue: 15,
    rewardItemQuantity: 1,
  },
  {
    title: "Rota dos Mercadores Perdida",
    description: "Abra caminho para a caravana presa entre oportunistas e destrocos.",
    difficulty: GameplayDifficulty.EASY,
    recommendedLevel: 4,
    imageUrl: "/assets/missions/merchant-route.png",
    startNpcName: "Selma Mercadora",
    completionNpcName: "Selma Mercadora",
    startDialogue: "Selma perdeu contato com dois carregadores no trecho de pedra da subida.",
    completionDialogue: "Sem essa rota eu perco estoque, clientes e paciencia. Bom trabalho.",
    repeatCooldownSeconds: 780,
    journey: {
      startNodeId: "merchant-briefing",
      nodes: [
        {
          id: "merchant-briefing",
          type: "DIALOGUE",
          title: "Carga atrasada",
          text: "Selma descreve o ultimo ponto de parada da caravana e os sinais de emboscada na subida.",
          nextNodeId: "merchant-choice",
        },
        {
          id: "merchant-choice",
          type: "CHOICE",
          title: "Abordagem na subida",
          text: "Voce pode inspecionar os barris jogados no caminho ou subir por um atalho entre rochas.",
          choices: [
            {
              id: "check-barrels",
              label: "Inspecionar os barris",
              description: "Busca pistas da caravana antes do confronto.",
              nextNodeId: "barrel-dialogue",
            },
            {
              id: "rock-shortcut",
              label: "Usar o atalho entre rochas",
              description: "Chega mais rapido ao ponto de bloqueio.",
              nextNodeId: "shortcut-dialogue",
            },
          ],
        },
        {
          id: "barrel-dialogue",
          type: "DIALOGUE",
          text: "Os barris tem marcas recentes de faca. O lider dos saqueadores ainda esta por perto.",
          nextNodeId: "merchant-combat",
        },
        {
          id: "shortcut-dialogue",
          type: "DIALOGUE",
          text: "No atalho voce pega o bloqueio pelo flanco e obriga o vigia inimigo a lutar sem cobertura.",
          nextNodeId: "merchant-combat",
        },
        {
          id: "merchant-combat",
          type: "COMBAT",
          title: "Bloqueio da caravana",
          text: "Derrote o saqueador que comanda a emboscada da rota comercial.",
          enemy: {
            name: "Vigia da Caravana Tomada",
            imageUrl: "/assets/enemies/caravan-lookout.png",
            level: 4,
            health: 74,
            attack: 14,
            defense: 6,
          },
          nextNodeId: "merchant-turn-in",
        },
        {
          id: "merchant-turn-in",
          type: "RETURN_TO_NPC",
          text: "Volte para Selma Mercadora e confirme a liberacao da rota.",
          npcId: "completion-npc-placeholder",
          nextNodeId: "merchant-complete",
        },
        {
          id: "merchant-complete",
          type: "COMPLETE",
          text: "A rota comercial volta a operar e Selma registra a entrega como concluida.",
        },
      ],
    },
    enemyName: "Vigia da Caravana Tomada",
    enemyLevel: 4,
    enemyHealth: 74,
    enemyAttack: 14,
    enemyDefense: 6,
    rewardXp: 58,
    rewardCoins: 32,
    rewardItemName: "Lacre Comercial Recuperado",
    rewardItemCategory: "quest",
    rewardItemType: "trade_seal",
    rewardItemImg: "/assets/items/trade-seal.png",
    rewardItemEffect: "Prova de reabertura da rota",
    rewardItemValue: 20,
    rewardItemQuantity: 1,
  },
  {
    title: "Fogueira na Mata Rasa",
    description: "Neutralize o bando que se reagrupou perto das arvores queimadas do limite sul.",
    difficulty: GameplayDifficulty.MEDIUM,
    recommendedLevel: 8,
    imageUrl: "/assets/missions/shallow-woods-fire.png",
    startNpcName: "Capita Mira",
    completionNpcName: "Mestre Rowan",
    startDialogue: "Os vigias viram fumaca de acampamento onde nao deveria haver ninguem.",
    completionDialogue: "Voce nao so venceu. Voltou com informacao util. Isso importa.",
    repeatCooldownSeconds: 960,
    journey: {
      startNodeId: "fire-briefing",
      nodes: [
        {
          id: "fire-briefing",
          type: "DIALOGUE",
          title: "Sinais de acampamento",
          text: "Capita Mira pede que voce confirme a presenca do bando e corte a lideranca antes do anoitecer.",
          nextNodeId: "fire-choice",
        },
        {
          id: "fire-choice",
          type: "CHOICE",
          title: "Entrada no acampamento",
          text: "Voce pode circular pelo lado queimado da mata ou se aproximar pela trilha dos caçadores.",
          choices: [
            {
              id: "burned-side",
              label: "Circular pelo lado queimado",
              description: "Menos cobertura, mas visao melhor do acampamento.",
              nextNodeId: "burned-side-dialogue",
            },
            {
              id: "hunter-trail",
              label: "Usar a trilha dos caçadores",
              description: "Mais cobertura para se aproximar silenciosamente.",
              nextNodeId: "hunter-trail-dialogue",
            },
          ],
        },
        {
          id: "burned-side-dialogue",
          type: "DIALOGUE",
          text: "Pelo lado queimado voce identifica o lider junto a fogueira central organizando a guarda.",
          nextNodeId: "fire-combat",
        },
        {
          id: "hunter-trail-dialogue",
          type: "DIALOGUE",
          text: "A trilha leva voce ate a retaguarda do acampamento, onde o bando se prepara para mais um saque.",
          nextNodeId: "fire-combat",
        },
        {
          id: "fire-combat",
          type: "COMBAT",
          title: "Comandante da fogueira",
          text: "Derrote o chefe do bando antes que ele disperse pela mata.",
          enemy: {
            name: "Chefe da Mata Rasa",
            imageUrl: "/assets/enemies/shallow-woods-chief.png",
            level: 8,
            health: 132,
            attack: 24,
            defense: 11,
          },
          nextNodeId: "fire-turn-in",
        },
        {
          id: "fire-turn-in",
          type: "RETURN_TO_NPC",
          text: "Retorne ao Mestre Rowan e relate como o acampamento foi desmontado.",
          npcId: "completion-npc-placeholder",
          nextNodeId: "fire-complete",
        },
        {
          id: "fire-complete",
          type: "COMPLETE",
          text: "O acampamento e desmontado e a regiao volta a ficar patrulhavel.",
        },
      ],
    },
    enemyName: "Chefe da Mata Rasa",
    enemyLevel: 8,
    enemyHealth: 132,
    enemyAttack: 24,
    enemyDefense: 11,
    rewardXp: 138,
    rewardCoins: 78,
    rewardItemName: "Marca de Cinza",
    rewardItemCategory: "quest",
    rewardItemType: "ash_mark",
    rewardItemImg: "/assets/items/ash-mark.png",
    rewardItemEffect: "Trofeu de patrulha usado no registro militar",
    rewardItemValue: 38,
    rewardItemQuantity: 1,
  },
  {
    title: "Ultimo Sino da Capela",
    description: "Investigue a pequena capela do caminho leste e silencie a criatura que tomou o local.",
    difficulty: GameplayDifficulty.MEDIUM,
    recommendedLevel: 10,
    imageUrl: "/assets/missions/chapel-bell.png",
    startNpcName: "Irmã Elise",
    completionNpcName: "Vigia Tomas",
    startDialogue: "O sino da capela tocou sozinho a madrugada inteira. Alguem precisa verificar.",
    completionDialogue: "A capela volta a servir de abrigo. Isso vai aliviar a rota leste.",
    repeatCooldownSeconds: 1080,
    journey: {
      startNodeId: "chapel-briefing",
      nodes: [
        {
          id: "chapel-briefing",
          type: "DIALOGUE",
          title: "Eco na capela",
          text: "Irma Elise acredita que algo expulsou os viajantes do refugio da estrada leste.",
          nextNodeId: "chapel-choice",
        },
        {
          id: "chapel-choice",
          type: "CHOICE",
          title: "Como entrar",
          text: "Voce pode entrar pela porta principal trincada ou contornar e acessar pelos fundos do cemitério.",
          choices: [
            {
              id: "front-door",
              label: "Entrar pela porta principal",
              description: "Entrada direta e mais arriscada.",
              nextNodeId: "front-door-dialogue",
            },
            {
              id: "graveyard-back",
              label: "Contornar pelo cemitério",
              description: "Acesso silencioso pelos fundos.",
              nextNodeId: "graveyard-dialogue",
            },
          ],
        },
        {
          id: "front-door-dialogue",
          type: "DIALOGUE",
          text: "O eco do sino atrai voce ate o altar quebrado, onde a criatura guarda o centro da capela.",
          nextNodeId: "chapel-combat",
        },
        {
          id: "graveyard-dialogue",
          type: "DIALOGUE",
          text: "Pelos fundos voce encontra marcas de garras e percebe que a criatura fez ninho perto do sino.",
          nextNodeId: "chapel-combat",
        },
        {
          id: "chapel-combat",
          type: "COMBAT",
          title: "Profanador do sino",
          text: "Derrote a criatura que dominou a capela e restaure o abrigo da estrada.",
          enemy: {
            name: "Profanador da Capela",
            imageUrl: "/assets/enemies/chapel-defiler.png",
            level: 10,
            health: 158,
            attack: 28,
            defense: 13,
          },
          nextNodeId: "chapel-turn-in",
        },
        {
          id: "chapel-turn-in",
          type: "RETURN_TO_NPC",
          text: "Entregue o relato ao Vigia Tomas para liberar a rota leste.",
          npcId: "completion-npc-placeholder",
          nextNodeId: "chapel-complete",
        },
        {
          id: "chapel-complete",
          type: "COMPLETE",
          text: "O sino se cala, a capela e reaberta e a patrulha atualiza o mapa seguro da regiao.",
        },
      ],
    },
    enemyName: "Profanador da Capela",
    enemyLevel: 10,
    enemyHealth: 158,
    enemyAttack: 28,
    enemyDefense: 13,
    rewardXp: 164,
    rewardCoins: 92,
    rewardItemName: "Fragmento do Sino",
    rewardItemCategory: "quest",
    rewardItemType: "chapel_bell_fragment",
    rewardItemImg: "/assets/items/chapel-bell-fragment.png",
    rewardItemEffect: "Prova da purificacao da capela",
    rewardItemValue: 44,
    rewardItemQuantity: 1,
  },
  {
    title: "Sinais na Ponte Partida",
    description: "Exemplo de missao no novo formato com NPC de origem, escolha de abordagem, combate e entrega.",
    difficulty: GameplayDifficulty.MEDIUM,
    recommendedLevel: 6,
    imageUrl: "/assets/missions/broken-bridge.png",
    startNpcName: "Capita Mira",
    completionNpcName: "Vigia Tomas",
    startDialogue: "Capita Mira precisa de um batedor para inspecionar a ponte partida.",
    completionDialogue: "Bom trabalho. A estrada volta a ficar segura por hoje.",
    repeatCooldownSeconds: 900,
    journey: {
      startNodeId: "briefing",
      nodes: [
        {
          id: "briefing",
          type: "DIALOGUE",
          title: "Briefing na barricada",
          text: "Capita Mira aponta para a neblina: ha rastros de saqueadores e sinais de emboscada perto da ponte.",
          nextNodeId: "approach",
        },
        {
          id: "approach",
          type: "CHOICE",
          title: "Escolha a abordagem",
          text: "Voce pode seguir pela trilha lateral ou cruzar a ponte direto para pressionar o lider inimigo.",
          choices: [
            {
              id: "scout-trail",
              label: "Seguir pela trilha lateral",
              description: "Caminho mais seguro e observacao do alvo antes do confronto.",
              nextNodeId: "trail-dialogue",
            },
            {
              id: "rush-bridge",
              label: "Avancar pela ponte",
              description: "Entrada direta para um confronto imediato e mais agressivo.",
              nextNodeId: "bridge-combat",
            },
          ],
        },
        {
          id: "trail-dialogue",
          type: "DIALOGUE",
          title: "Observacao do terreno",
          text: "Pela lateral, voce identifica o lider coordenando o bloqueio e encontra o melhor momento para atacar.",
          nextNodeId: "bridge-combat",
        },
        {
          id: "bridge-combat",
          type: "COMBAT",
          title: "Confronto na ponte",
          text: "Derrote o lider dos saqueadores e abra passagem para as caravanas.",
          enemy: {
            name: "Chefe da Ponte Partida",
            imageUrl: "/assets/enemies/broken-bridge-chief.png",
            level: 7,
            health: 118,
            attack: 22,
            defense: 10,
          },
          nextNodeId: "turn-in",
        },
        {
          id: "turn-in",
          type: "RETURN_TO_NPC",
          text: "Volte ate o Vigia Tomas e entregue o relatorio da patrulha.",
          npcId: "completion-npc-placeholder",
          nextNodeId: "complete",
        },
        {
          id: "complete",
          type: "COMPLETE",
          text: "A ponte foi liberada e o posto avancado retomou o controle da rota.",
        },
      ],
    },
    enemyName: "Chefe da Ponte Partida",
    enemyLevel: 7,
    enemyHealth: 118,
    enemyAttack: 22,
    enemyDefense: 10,
    rewardXp: 120,
    rewardCoins: 72,
    rewardItemName: "Relatorio Lacrado da Patrulha",
    rewardItemCategory: "quest",
    rewardItemType: "sealed_patrol_report",
    rewardItemImg: "/assets/items/sealed-patrol-report.png",
    rewardItemEffect: "Documento usado para confirmar a entrega da missao",
    rewardItemValue: 35,
    rewardItemQuantity: 1,
  },
];

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

  const npcs: SeedNpc[] = [
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
    {
      name: "Arcanista Lyra",
      role: "buffer",
      interactionType: "buffer",
      description: "Encantadora que fortalece aventureiros por uma taxa em gold.",
      dialogue: "Escolha a intensidade do encantamento: 2%, 4% ou 6%. Quanto maior o poder, maior o custo.",
      xpReward: 0,
      coinsReward: 0,
    },
    {
      name: "Capita Mira",
      role: "commander",
      interactionType: "mission_giver",
      imageUrl: "/assets/npcs/captain-mira.png",
      description: "Responsavel pela seguranca do posto avancado na Estrada Velha.",
      dialogue: "Preciso de alguem para reconhecer a ponte e eliminar quem estiver bloqueando a rota.",
      xpReward: 0,
      coinsReward: 12,
    },
    {
      name: "Vigia Tomas",
      role: "quartermaster",
      interactionType: "mission_receiver",
      imageUrl: "/assets/npcs/watchman-tomas.png",
      description: "Vigia que registra relatorios e recompensas das patrulhas locais.",
      dialogue: "Se a rota estiver limpa, eu valido o relatorio e libero sua recompensa.",
      xpReward: 15,
      coinsReward: 10,
    },
  ];

  const seededNpcsByName = new Map<string, { id: string; name: string }>();

  for (const npc of npcs) {
    const existingNpc = await prisma.npcDefinition.findFirst({
      where: {
        name: npc.name,
        interactionType: npc.interactionType,
      },
    });

    if (existingNpc) {
      const persistedNpc = await prisma.npcDefinition.update({
        where: { id: existingNpc.id },
        data: {
          ...npc,
          isActive: true,
          rewardItemQuantity: npc.rewardItemQuantity ?? 1,
        },
      });

      seededNpcsByName.set(persistedNpc.name, persistedNpc);
    } else {
      const persistedNpc = await prisma.npcDefinition.create({
        data: {
          ...npc,
          isActive: true,
          rewardItemQuantity: npc.rewardItemQuantity ?? 1,
        },
      });

      seededNpcsByName.set(persistedNpc.name, persistedNpc);
    }
  }

  for (const mission of missions) {
    const startNpcId = mission.startNpcName
      ? seededNpcsByName.get(mission.startNpcName)?.id ?? null
      : null;
    const completionNpcId = mission.completionNpcName
      ? seededNpcsByName.get(mission.completionNpcName)?.id ?? null
      : null;

    const journey =
      mission.journey && completionNpcId
        ? {
            ...mission.journey,
            nodes: mission.journey.nodes.map((node) =>
              node.type === "RETURN_TO_NPC" && node.npcId === "completion-npc-placeholder"
                ? { ...node, npcId: completionNpcId }
                : node
            ),
          }
        : mission.journey;

    const missionData = {
      title: mission.title,
      description: mission.description,
      difficulty: mission.difficulty,
      recommendedLevel: mission.recommendedLevel,
      imageUrl: mission.imageUrl ?? null,
      startNpcId,
      completionNpcId,
      startDialogue: mission.startDialogue ?? null,
      completionDialogue: mission.completionDialogue ?? null,
      repeatCooldownSeconds: mission.repeatCooldownSeconds ?? 1800,
      journey: journey ? (journey as Prisma.InputJsonValue) : Prisma.JsonNull,
      enemyName: mission.enemyName,
      enemyLevel: mission.enemyLevel,
      enemyHealth: mission.enemyHealth,
      enemyAttack: mission.enemyAttack,
      enemyDefense: mission.enemyDefense,
      rewardXp: mission.rewardXp,
      rewardCoins: mission.rewardCoins,
      rewardItemName: mission.rewardItemName ?? null,
      rewardItemCategory: mission.rewardItemCategory ?? null,
      rewardItemType: mission.rewardItemType ?? null,
      rewardItemImg: mission.rewardItemImg ?? null,
      rewardItemEffect: mission.rewardItemEffect ?? null,
      rewardItemValue: mission.rewardItemValue ?? null,
      rewardItemQuantity: mission.rewardItemQuantity ?? 1,
      isActive: true,
    };

    const existingMission = await prisma.missionDefinition.findFirst({
      where: { title: mission.title },
    });

    if (existingMission) {
      await prisma.missionDefinition.update({
        where: { id: existingMission.id },
        data: missionData,
      });
    } else {
      await prisma.missionDefinition.create({
        data: missionData,
      });
    }
  }

  const baseProducts = [
    {
      slug: "small-health-potion",
      name: "Pocao Pequena de Vida",
      description: "Consumivel para recuperar vida.",
      category: "consumable",
      type: "healing",
      img: "/assets/items/potion-small.png",
      effect: "+50 HP",
      levelRequirement: 1,
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
  ];

  const equipmentProducts = [
  // =========================
  // EARLY GAME | LV 1 - 20
  // Loja | 50 - 500 gold
  // Status alvo: 3 - 20
  // =========================

  {
    slug: "early-iron-blade",
    name: "Lamina de Ferro",
    description: "Arma inicial simples para os primeiros combates.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/early-iron-blade.png",
    effect: "+4 ATK",
    levelRequirement: 1,
    tier: 1,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 60,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-hide-armor",
    name: "Armadura de Couro Cru",
    description: "Protecao basica para aumentar a sobrevivencia no inicio.",
    category: "armor",
    type: "armor",
    img: "/assets/items/early-hide-armor.png",
    effect: "+10 HP",
    levelRequirement: 1,
    tier: 1,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 55,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-bone-charm",
    name: "Amuleto de Osso",
    description: "Acessorio inicial para reforco defensivo leve.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/early-bone-charm.png",
    effect: "+3 DEF",
    levelRequirement: 3,
    tier: 1,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 70,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-vital-blade",
    name: "Lamina da Vitalidade",
    description: "Arma inicial para quem precisa de dano e margem de erro.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/early-vital-blade.png",
    effect: "+3 ATK +8 HP",
    levelRequirement: 5,
    tier: 2,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 110,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-swift-blade",
    name: "Lamina do Golpe Rapido",
    description: "Arma leve para jogadores que querem agressividade no early.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/early-swift-blade.png",
    effect: "+5 ATK +2 CRIT",
    levelRequirement: 8,
    tier: 2,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 145,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-guard-armor",
    name: "Armadura do Recruta",
    description: "Armadura simples voltada para seguranca nas missoes iniciais.",
    category: "armor",
    type: "armor",
    img: "/assets/items/early-guard-armor.png",
    effect: "+14 HP +2 DEF",
    levelRequirement: 7,
    tier: 2,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 130,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-hunter-charm",
    name: "Amuleto do Olho Vivo",
    description: "Acessorio inicial para experimentar builds de critico.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/early-hunter-charm.png",
    effect: "+4 CRIT",
    levelRequirement: 10,
    tier: 2,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 170,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-steel-blade",
    name: "Lamina de Aco Curto",
    description: "Arma de transicao forte para fechar o early game.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/early-steel-blade.png",
    effect: "+9 ATK",
    levelRequirement: 12,
    tier: 3,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 220,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-veteran-armor",
    name: "Armadura do Sobrevivente",
    description: "Protecao reforcada para os desafios finais do early game.",
    category: "armor",
    type: "armor",
    img: "/assets/items/early-veteran-armor.png",
    effect: "+18 HP +4 DEF",
    levelRequirement: 15,
    tier: 3,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 260,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-tactical-charm",
    name: "Sigilo Tatico",
    description: "Acessorio de transicao com foco em estabilidade geral.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/early-tactical-charm.png",
    effect: "+3 DEF +3 CRIT",
    levelRequirement: 18,
    tier: 3,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 320,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "early-knight-blade",
    name: "Lamina do Aspirante",
    description: "Ultimo grande upgrade compravel do early game.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/early-knight-blade.png",
    effect: "+12 ATK +4 HP",
    levelRequirement: 20,
    tier: 4,
    tierGroup: "EARLY",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 420,
    currency: "GOLD",
    isActive: true,
  },

  // =========================
  // MID GAME | LV 25 - 40
  // Loja premium | 1200 - 4000 gold
  // Status alvo: 23 - 36
  // =========================

  {
    slug: "mid-mercenary-blade",
    name: "Lamina do Mercenario",
    description: "Arma robusta para jogadores que entraram no mid game.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/mid-mercenary-blade.png",
    effect: "+23 ATK",
    levelRequirement: 25,
    tier: 5,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 1200,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-guardian-armor",
    name: "Armadura do Guardiao",
    description: "Protecao confiavel para lutas mais longas e perigosas.",
    category: "armor",
    type: "armor",
    img: "/assets/items/mid-guardian-armor.png",
    effect: "+26 HP +6 DEF",
    levelRequirement: 25,
    tier: 5,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 1300,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-bastion-charm",
    name: "Talisma do Bastiao",
    description: "Acessorio de defesa e firmeza para conteudo intermediario.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/mid-bastion-charm.png",
    effect: "+10 DEF",
    levelRequirement: 27,
    tier: 5,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 1400,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-duelist-blade",
    name: "Lamina do Duelista",
    description: "Arma tecnica voltada para dano consistente com chance critica.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/mid-duelist-blade.png",
    effect: "+18 ATK +6 CRIT",
    levelRequirement: 30,
    tier: 6,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 1850,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-vital-armor",
    name: "Armadura da Vigilia",
    description: "Armadura para builds de sobrevivencia e estabilidade.",
    category: "armor",
    type: "armor",
    img: "/assets/items/mid-vital-armor.png",
    effect: "+34 HP +4 DEF",
    levelRequirement: 30,
    tier: 6,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 1700,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-predator-charm",
    name: "Olho do Predador",
    description: "Acessorio mid game para builds mais ofensivas.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/mid-predator-charm.png",
    effect: "+7 CRIT +4 ATK",
    levelRequirement: 32,
    tier: 6,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 2100,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-champion-blade",
    name: "Lamina do Campeao",
    description: "Upgrade pesado para jogadores em conteudo alto de mid game.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/mid-champion-blade.png",
    effect: "+30 ATK",
    levelRequirement: 35,
    tier: 7,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 2600,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-champion-armor",
    name: "Armadura do Campeao",
    description: "Protecao de elite para encontros de risco elevado.",
    category: "armor",
    type: "armor",
    img: "/assets/items/mid-champion-armor.png",
    effect: "+36 HP +8 DEF",
    levelRequirement: 36,
    tier: 7,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 2800,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-war-sigil",
    name: "Sigilo de Guerra",
    description: "Acessorio premium de mid game para builds equilibradas.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/mid-war-sigil.png",
    effect: "+8 DEF +6 CRIT",
    levelRequirement: 38,
    tier: 7,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 3100,
    currency: "GOLD",
    isActive: true,
  },
  {
    slug: "mid-elite-blade",
    name: "Lamina de Elite",
    description: "Ultimo pico de poder comprado com gold antes do end game.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/mid-elite-blade.png",
    effect: "+36 ATK",
    levelRequirement: 40,
    tier: 8,
    tierGroup: "MID",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    price: 3900,
    currency: "GOLD",
    isActive: true,
  },

  // =========================
  // END GAME | LV 45 - 60
  // Bounty + Craft
  // Status alvo: 43 - 80
  // =========================

  {
    slug: "end-eclipse-blade",
    name: "Lamina do Eclipse",
    description: "Arma de end game criada com materiais raros de bounty.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/end-eclipse-blade.png",
    effect: "+43 ATK",
    levelRequirement: 45,
    tier: 9,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Nucleo de Bounty Lv45", quantity: 4 },
        { item: "Fragmento Obscuro", quantity: 8 },
      ],
    },
    isActive: true,
  },
  {
    slug: "end-celestial-armor",
    name: "Armadura Celestial",
    description: "Protecao refinada para encarar o conteudo mais perigoso do jogo.",
    category: "armor",
    type: "armor",
    img: "/assets/items/end-celestial-armor.png",
    effect: "+48 HP +12 DEF",
    levelRequirement: 45,
    tier: 9,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Placa Celestial", quantity: 5 },
        { item: "Nucleo de Bounty Lv45", quantity: 3 },
      ],
    },
    isActive: true,
  },
  {
    slug: "end-astral-charm",
    name: "Sigilo Astral",
    description: "Acessorio de end game para elevar a eficiencia ofensiva.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/end-astral-charm.png",
    effect: "+12 CRIT +8 ATK",
    levelRequirement: 47,
    tier: 9,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Olho Astral", quantity: 2 },
        { item: "Fragmento de Elite", quantity: 10 },
      ],
    },
    isActive: true,
  },
  {
    slug: "end-rupture-blade",
    name: "Lamina da Ruptura",
    description: "Arma brutal de risco alto para builds ofensivas de burst.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/end-rupture-blade.png",
    effect: "+36 ATK +12 CRIT -20 HP",
    levelRequirement: 50,
    tier: 10,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Essencia de Bounty Lv50", quantity: 5 },
        { item: "Nucleo do Abismo", quantity: 2 },
      ],
    },
    isActive: true,
  },
  {
    slug: "end-sacrifice-armor",
    name: "Armadura do Sacrificio",
    description: "Armadura extrema para personagens que priorizam resistencia absoluta.",
    category: "armor",
    type: "armor",
    img: "/assets/items/end-sacrifice-armor.png",
    effect: "+20 DEF +52 HP -8 ATK",
    levelRequirement: 50,
    tier: 10,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Carapaca Antiga", quantity: 4 },
        { item: "Essencia de Bounty Lv50", quantity: 4 },
      ],
    },
    isActive: true,
  },
  {
    slug: "end-entropy-charm",
    name: "Sigilo da Entropia",
    description: "Charm de alta agressividade para builds criticas de fim de jogo.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/end-entropy-charm.png",
    effect: "+14 CRIT +10 ATK -6 DEF",
    levelRequirement: 52,
    tier: 10,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Essencia Corrompida", quantity: 10 },
        { item: "Olho da Entropia", quantity: 2 },
      ],
    },
    isActive: true,
  },
  {
    slug: "end-sovereign-blade",
    name: "Lamina do Soberano",
    description: "Arma lendaria de end game para dominacao ofensiva.",
    category: "weapon",
    type: "weapon",
    img: "/assets/items/end-sovereign-blade.png",
    effect: "+55 ATK",
    levelRequirement: 55,
    tier: 11,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Essencia de Bounty Lv55", quantity: 6 },
        { item: "Aco Ancestral", quantity: 12 },
      ],
    },
    isActive: true,
  },
  {
    slug: "end-sovereign-armor",
    name: "Armadura do Soberano",
    description: "Armadura lendaria para encarar chefes e encounters finais.",
    category: "armor",
    type: "armor",
    img: "/assets/items/end-sovereign-armor.png",
    effect: "+64 HP +16 DEF",
    levelRequirement: 55,
    tier: 11,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Essencia de Bounty Lv55", quantity: 6 },
        { item: "Placa Ancestral", quantity: 10 },
      ],
    },
    isActive: true,
  },
  {
    slug: "end-predator-core",
    name: "Foco do Predador Astral",
    description: "Acessorio lendario para amplificar burst e frequencia critica.",
    category: "accessory",
    type: "accessory",
    img: "/assets/items/end-predator-core.png",
    effect: "+16 CRIT +12 ATK",
    levelRequirement: 58,
    tier: 11,
    tierGroup: "END",
    assetKind: ShopProductAssetKind.EQUIPMENT,
    isCraftable: true,
    craft: {
      materials: [
        { item: "Olho Ancestral", quantity: 3 },
        { item: "Essencia de Elite Superior", quantity: 12 },
      ],
    },
    isActive: true,
  },
    {
      slug: "end-void-crown",
      name: "Coroa do Vazio",
      description: "Acessorio maximo de poder ofensivo para o topo da progressao.",
      category: "accessory",
      type: "accessory",
      img: "/assets/items/end-void-crown.png",
      effect: "+18 CRIT +18 ATK -10 DEF",
      levelRequirement: 60,
      tier: 12,
      tierGroup: "END",
      assetKind: ShopProductAssetKind.EQUIPMENT,
      isCraftable: true,
      craft: {
        materials: [
          { item: "Essencia de Bounty Lv60", quantity: 8 },
          { item: "Fragmento do Vazio", quantity: 15 },
          { item: "Coracao Ancestral", quantity: 1 },
        ],
      },
      isActive: true,
    },
  ];

  const products = [
    ...baseProducts,
    ...equipmentProducts.flatMap((product) => {
      if (typeof product.price !== "number") {
        return [];
      }

      const { tier, tierGroup, isCraftable, craft, ...shopProduct } = product;

      return [
        {
          ...shopProduct,
          price: product.price,
          currency: shopProduct.currency ?? "BRL",
          rewardCoins: 0,
          rewardQuantity: 1,
        },
      ];
    }),
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
