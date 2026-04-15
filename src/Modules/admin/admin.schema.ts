import { Request } from "express";
import { AppError } from "../../errors/AppError";
import {
  getBody,
  optionalArray,
  optionalNumber,
  optionalObject,
  optionalString,
  requireArray,
  requireObject,
  requirePositiveInt,
  requireString,
} from "../../utils/validation";
import {
  CreateBountyInput,
  CreateMissionInput,
  CreateMonsterInput,
  CreateNpcInput,
  CreateShopProductInput,
  CreateTrainingInput,
  UpdateBountyInput,
  UpdateMissionInput,
  UpdateMonsterInput,
  UpdateNpcInput,
  UpdateShopProductInput,
  UpdateTrainingInput,
  MissionJourneyChoiceInput,
  MissionJourneyEnemyInput,
  MissionJourneyInput,
  MissionJourneyNodeInput,
} from "./admin.types";

const parseBoolean = (value: unknown, fieldName: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new AppError(400, `Campo ${fieldName} deve ser booleano.`, "VALIDATION_ERROR");
  }

  return value;
};

const requireDifficulty = (value: unknown, fieldName: string) => {
  const difficulty = requireString(value, fieldName, 1, 20) as
    | "EASY"
    | "MEDIUM"
    | "HARD"
    | "ELITE";

  if (!["EASY", "MEDIUM", "HARD", "ELITE"].includes(difficulty)) {
    throw new AppError(400, `Campo ${fieldName} invalido.`, "VALIDATION_ERROR");
  }

  return difficulty;
};

const optionalDifficulty = (value: unknown, fieldName: string) => {
  if (value === undefined) {
    return undefined;
  }

  return requireDifficulty(value, fieldName);
};

const requireAssetKind = (value: unknown, fieldName: string) => {
  const assetKind = requireString(value, fieldName, 1, 20) as "ITEM" | "EQUIPMENT" | "COINS";

  if (!["ITEM", "EQUIPMENT", "COINS"].includes(assetKind)) {
    throw new AppError(400, `Campo ${fieldName} invalido.`, "VALIDATION_ERROR");
  }

  return assetKind;
};

const optionalAssetKind = (value: unknown, fieldName: string) => {
  if (value === undefined) {
    return undefined;
  }

  return requireAssetKind(value, fieldName);
};

const requireIsoDate = (value: unknown, fieldName: string) => {
  const dateValue = requireString(value, fieldName, 10, 80);
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, `Campo ${fieldName} deve ser uma data valida.`, "VALIDATION_ERROR");
  }

  return parsed.toISOString();
};

const optionalIsoDate = (value: unknown, fieldName: string) => {
  if (value === undefined) {
    return undefined;
  }

  return requireIsoDate(value, fieldName);
};

const optionalPositiveInt = (
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number }
) => {
  if (value === undefined) {
    return undefined;
  }

  return requirePositiveInt(value, fieldName, options);
};

const parseMissionEnemy = (value: unknown, fieldName: string): MissionJourneyEnemyInput => {
  const enemy = requireObject(value, fieldName);

  return {
    name: requireString(enemy.name, `${fieldName}.name`, 2, 80),
    imageUrl: optionalString(enemy.imageUrl, `${fieldName}.imageUrl`, 1, 255),
    level: requirePositiveInt(enemy.level, `${fieldName}.level`, { min: 1, max: 999 }),
    health: requirePositiveInt(enemy.health, `${fieldName}.health`, { min: 1, max: 1_000_000 }),
    attack: requirePositiveInt(enemy.attack, `${fieldName}.attack`, { min: 1, max: 1_000_000 }),
    defense: requirePositiveInt(enemy.defense, `${fieldName}.defense`, { min: 0, max: 1_000_000 }),
  };
};

const parseMissionChoices = (value: unknown, fieldName: string): MissionJourneyChoiceInput[] => {
  return requireArray(value, fieldName).map((entry, index) => {
    const choice = requireObject(entry, `${fieldName}[${index}]`);

    return {
      id: requireString(choice.id, `${fieldName}[${index}].id`, 1, 80),
      label: requireString(choice.label, `${fieldName}[${index}].label`, 1, 120),
      description: optionalString(
        choice.description,
        `${fieldName}[${index}].description`,
        1,
        255
      ),
      nextNodeId: requireString(choice.nextNodeId, `${fieldName}[${index}].nextNodeId`, 1, 80),
    };
  });
};

const parseMissionNode = (value: unknown, fieldName: string): MissionJourneyNodeInput => {
  const node = requireObject(value, fieldName);
  const type = requireString(node.type, `${fieldName}.type`, 1, 40) as MissionJourneyNodeInput["type"];

  if (!["DIALOGUE", "CHOICE", "COMBAT", "RETURN_TO_NPC", "COMPLETE"].includes(type)) {
    throw new AppError(400, `Campo ${fieldName}.type invalido.`, "VALIDATION_ERROR");
  }

  const parsed: MissionJourneyNodeInput = {
    id: requireString(node.id, `${fieldName}.id`, 1, 80),
    type,
    title: optionalString(node.title, `${fieldName}.title`, 1, 120),
    text: optionalString(node.text, `${fieldName}.text`, 1, 1000),
    nextNodeId: optionalString(node.nextNodeId, `${fieldName}.nextNodeId`, 1, 80),
    npcId: optionalString(node.npcId, `${fieldName}.npcId`, 1, 80),
  };

  if (type === "CHOICE") {
    parsed.choices = parseMissionChoices(node.choices, `${fieldName}.choices`);
  }

  if (type === "COMBAT") {
    parsed.enemy = parseMissionEnemy(node.enemy, `${fieldName}.enemy`);
  }

  return parsed;
};

const parseMissionJourney = (value: unknown, fieldName: string): MissionJourneyInput => {
  const journey = requireObject(value, fieldName);
  const nodes = requireArray(journey.nodes, `${fieldName}.nodes`).map((entry, index) =>
    parseMissionNode(entry, `${fieldName}.nodes[${index}]`)
  );
  const startNodeId = requireString(journey.startNodeId, `${fieldName}.startNodeId`, 1, 80);

  const nodeIds = new Set(nodes.map((node) => node.id));
  if (!nodeIds.has(startNodeId)) {
    throw new AppError(
      400,
      `Campo ${fieldName}.startNodeId deve apontar para um no existente.`,
      "VALIDATION_ERROR"
    );
  }

  for (const node of nodes) {
    if (node.nextNodeId && !nodeIds.has(node.nextNodeId)) {
      throw new AppError(
        400,
        `No ${node.id} aponta para nextNodeId inexistente.`,
        "VALIDATION_ERROR"
      );
    }

    for (const choice of node.choices ?? []) {
      if (!nodeIds.has(choice.nextNodeId)) {
        throw new AppError(
          400,
          `Escolha ${choice.id} do no ${node.id} aponta para nextNodeId inexistente.`,
          "VALIDATION_ERROR"
        );
      }
    }
  }

  return { startNodeId, nodes };
};

const optionalMissionJourney = (value: unknown, fieldName: string) => {
  if (value === undefined) {
    return undefined;
  }

  return parseMissionJourney(value, fieldName);
};

export const validateCreateMonster = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateMonsterInput = {
    name: requireString(body.name, "name", 2, 80),
    description: optionalString(body.description, "description", 1, 255),
    imageUrl: optionalString(body.imageUrl, "imageUrl", 1, 255),
    level: requirePositiveInt(body.level, "level", { min: 1, max: 999 }),
    health: requirePositiveInt(body.health, "health", { min: 1, max: 1_000_000 }),
    attack: requirePositiveInt(body.attack, "attack", { min: 1, max: 1_000_000 }),
    defense: requirePositiveInt(body.defense, "defense", { min: 0, max: 1_000_000 }),
    experience: requirePositiveInt(body.experience, "experience", { min: 1, max: 1_000_000 }),
  };

  req.body = parsed;
};

export const validateUpdateMonster = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateMonsterInput = {
    name: optionalString(body.name, "name", 2, 80),
    description: optionalString(body.description, "description", 1, 255),
    imageUrl: optionalString(body.imageUrl, "imageUrl", 1, 255),
    level: optionalNumber(body.level, "level", { min: 1, max: 999 }),
    health: optionalNumber(body.health, "health", { min: 1, max: 1_000_000 }),
    attack: optionalNumber(body.attack, "attack", { min: 1, max: 1_000_000 }),
    defense: optionalNumber(body.defense, "defense", { min: 0, max: 1_000_000 }),
    experience: optionalNumber(body.experience, "experience", { min: 1, max: 1_000_000 }),
  };

  ensureHasFields(parsed, "monster");
  req.body = parsed;
};

export const validateCreateBounty = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateBountyInput = {
    title: requireString(body.title, "title", 2, 100),
    description: optionalString(body.description, "description", 1, 500),
    monsterId: requireString(body.monsterId, "monsterId", 1, 80),
    recommendedLevel: requirePositiveInt(body.recommendedLevel, "recommendedLevel", {
      min: 1,
      max: 999,
    }),
    difficulty: requireDifficulty(body.difficulty, "difficulty"),
    reward: requirePositiveInt(body.reward, "reward", { min: 0, max: 1_000_000 }),
    rewardXp: requirePositiveInt(body.rewardXp, "rewardXp", { min: 0, max: 1_000_000 }),
    rewardItemName: optionalString(body.rewardItemName, "rewardItemName", 1, 100),
    rewardItemCategory: optionalString(body.rewardItemCategory, "rewardItemCategory", 1, 60),
    rewardItemType: optionalString(body.rewardItemType, "rewardItemType", 1, 60),
    rewardItemImg: optionalString(body.rewardItemImg, "rewardItemImg", 1, 255),
    rewardItemEffect: optionalString(body.rewardItemEffect, "rewardItemEffect", 1, 255),
    rewardItemValue: optionalNumber(body.rewardItemValue, "rewardItemValue", {
      min: 0,
      max: 1_000_000,
    }),
    rewardItemQuantity: optionalNumber(body.rewardItemQuantity, "rewardItemQuantity", {
      min: 1,
      max: 999,
    }),
    timeLimit: requireIsoDate(body.timeLimit, "timeLimit"),
    status: requireString(body.status, "status", 2, 40),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  req.body = parsed;
};

export const validateUpdateBounty = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateBountyInput = {
    title: optionalString(body.title, "title", 2, 100),
    description: optionalString(body.description, "description", 1, 500),
    monsterId: optionalString(body.monsterId, "monsterId", 1, 80),
    recommendedLevel: optionalNumber(body.recommendedLevel, "recommendedLevel", {
      min: 1,
      max: 999,
    }),
    difficulty: optionalDifficulty(body.difficulty, "difficulty"),
    reward: optionalNumber(body.reward, "reward", { min: 0, max: 1_000_000 }),
    rewardXp: optionalNumber(body.rewardXp, "rewardXp", { min: 0, max: 1_000_000 }),
    rewardItemName: optionalString(body.rewardItemName, "rewardItemName", 1, 100),
    rewardItemCategory: optionalString(body.rewardItemCategory, "rewardItemCategory", 1, 60),
    rewardItemType: optionalString(body.rewardItemType, "rewardItemType", 1, 60),
    rewardItemImg: optionalString(body.rewardItemImg, "rewardItemImg", 1, 255),
    rewardItemEffect: optionalString(body.rewardItemEffect, "rewardItemEffect", 1, 255),
    rewardItemValue: optionalNumber(body.rewardItemValue, "rewardItemValue", {
      min: 0,
      max: 1_000_000,
    }),
    rewardItemQuantity: optionalNumber(body.rewardItemQuantity, "rewardItemQuantity", {
      min: 1,
      max: 999,
    }),
    timeLimit: optionalIsoDate(body.timeLimit, "timeLimit"),
    status: optionalString(body.status, "status", 2, 40),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  ensureHasFields(parsed, "bounty");
  req.body = parsed;
};

export const validateCreateMission = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateMissionInput = {
    title: requireString(body.title, "title", 2, 100),
    description: optionalString(body.description, "description", 1, 500),
    difficulty: requireDifficulty(body.difficulty, "difficulty"),
    recommendedLevel: requirePositiveInt(body.recommendedLevel, "recommendedLevel", {
      min: 1,
      max: 999,
    }),
    imageUrl: optionalString(body.imageUrl, "imageUrl", 1, 255),
    startNpcId: optionalString(body.startNpcId, "startNpcId", 1, 80),
    completionNpcId: optionalString(body.completionNpcId, "completionNpcId", 1, 80),
    startDialogue: optionalString(body.startDialogue, "startDialogue", 1, 1000),
    completionDialogue: optionalString(body.completionDialogue, "completionDialogue", 1, 1000),
    repeatCooldownSeconds: optionalPositiveInt(body.repeatCooldownSeconds, "repeatCooldownSeconds", {
      min: 0,
      max: 31_536_000,
    }),
    journey: optionalMissionJourney(body.journey, "journey"),
    enemyName: requireString(body.enemyName, "enemyName", 2, 80),
    enemyLevel: requirePositiveInt(body.enemyLevel, "enemyLevel", { min: 1, max: 999 }),
    enemyHealth: requirePositiveInt(body.enemyHealth, "enemyHealth", {
      min: 1,
      max: 1_000_000,
    }),
    enemyAttack: requirePositiveInt(body.enemyAttack, "enemyAttack", {
      min: 1,
      max: 1_000_000,
    }),
    enemyDefense: requirePositiveInt(body.enemyDefense, "enemyDefense", {
      min: 0,
      max: 1_000_000,
    }),
    rewardXp: requirePositiveInt(body.rewardXp, "rewardXp", { min: 0, max: 1_000_000 }),
    rewardCoins: requirePositiveInt(body.rewardCoins, "rewardCoins", { min: 0, max: 1_000_000 }),
    rewardItemName: optionalString(body.rewardItemName, "rewardItemName", 1, 100),
    rewardItemCategory: optionalString(body.rewardItemCategory, "rewardItemCategory", 1, 60),
    rewardItemType: optionalString(body.rewardItemType, "rewardItemType", 1, 60),
    rewardItemImg: optionalString(body.rewardItemImg, "rewardItemImg", 1, 255),
    rewardItemEffect: optionalString(body.rewardItemEffect, "rewardItemEffect", 1, 255),
    rewardItemValue: optionalNumber(body.rewardItemValue, "rewardItemValue", {
      min: 0,
      max: 1_000_000,
    }),
    rewardItemQuantity: optionalNumber(body.rewardItemQuantity, "rewardItemQuantity", {
      min: 1,
      max: 999,
    }),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  req.body = parsed;
};

export const validateUpdateMission = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateMissionInput = {
    title: optionalString(body.title, "title", 2, 100),
    description: optionalString(body.description, "description", 1, 500),
    difficulty: optionalDifficulty(body.difficulty, "difficulty"),
    recommendedLevel: optionalNumber(body.recommendedLevel, "recommendedLevel", {
      min: 1,
      max: 999,
    }),
    imageUrl: optionalString(body.imageUrl, "imageUrl", 1, 255),
    startNpcId: optionalString(body.startNpcId, "startNpcId", 1, 80),
    completionNpcId: optionalString(body.completionNpcId, "completionNpcId", 1, 80),
    startDialogue: optionalString(body.startDialogue, "startDialogue", 1, 1000),
    completionDialogue: optionalString(body.completionDialogue, "completionDialogue", 1, 1000),
    repeatCooldownSeconds: optionalPositiveInt(body.repeatCooldownSeconds, "repeatCooldownSeconds", {
      min: 0,
      max: 31_536_000,
    }),
    journey: optionalMissionJourney(body.journey, "journey"),
    enemyName: optionalString(body.enemyName, "enemyName", 2, 80),
    enemyLevel: optionalNumber(body.enemyLevel, "enemyLevel", { min: 1, max: 999 }),
    enemyHealth: optionalNumber(body.enemyHealth, "enemyHealth", {
      min: 1,
      max: 1_000_000,
    }),
    enemyAttack: optionalNumber(body.enemyAttack, "enemyAttack", {
      min: 1,
      max: 1_000_000,
    }),
    enemyDefense: optionalNumber(body.enemyDefense, "enemyDefense", {
      min: 0,
      max: 1_000_000,
    }),
    rewardXp: optionalNumber(body.rewardXp, "rewardXp", { min: 0, max: 1_000_000 }),
    rewardCoins: optionalNumber(body.rewardCoins, "rewardCoins", { min: 0, max: 1_000_000 }),
    rewardItemName: optionalString(body.rewardItemName, "rewardItemName", 1, 100),
    rewardItemCategory: optionalString(body.rewardItemCategory, "rewardItemCategory", 1, 60),
    rewardItemType: optionalString(body.rewardItemType, "rewardItemType", 1, 60),
    rewardItemImg: optionalString(body.rewardItemImg, "rewardItemImg", 1, 255),
    rewardItemEffect: optionalString(body.rewardItemEffect, "rewardItemEffect", 1, 255),
    rewardItemValue: optionalNumber(body.rewardItemValue, "rewardItemValue", {
      min: 0,
      max: 1_000_000,
    }),
    rewardItemQuantity: optionalNumber(body.rewardItemQuantity, "rewardItemQuantity", {
      min: 1,
      max: 999,
    }),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  ensureHasFields(parsed, "mission");
  req.body = parsed;
};

export const validateCreateTraining = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateTrainingInput = {
    name: requireString(body.name, "name", 2, 100),
    description: optionalString(body.description, "description", 1, 500),
    trainingType: requireString(body.trainingType, "trainingType", 2, 60),
    xpReward: requirePositiveInt(body.xpReward, "xpReward", { min: 0, max: 1_000_000 }),
    coinsReward: optionalNumber(body.coinsReward, "coinsReward", { min: 0, max: 1_000_000 }),
    cooldownSeconds: optionalNumber(body.cooldownSeconds, "cooldownSeconds", {
      min: 0,
      max: 31_536_000,
    }),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  req.body = parsed;
};

export const validateUpdateTraining = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateTrainingInput = {
    name: optionalString(body.name, "name", 2, 100),
    description: optionalString(body.description, "description", 1, 500),
    trainingType: optionalString(body.trainingType, "trainingType", 2, 60),
    xpReward: optionalNumber(body.xpReward, "xpReward", { min: 0, max: 1_000_000 }),
    coinsReward: optionalNumber(body.coinsReward, "coinsReward", { min: 0, max: 1_000_000 }),
    cooldownSeconds: optionalNumber(body.cooldownSeconds, "cooldownSeconds", {
      min: 0,
      max: 31_536_000,
    }),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  ensureHasFields(parsed, "training");
  req.body = parsed;
};

export const validateCreateNpc = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateNpcInput = {
    name: requireString(body.name, "name", 2, 100),
    role: requireString(body.role, "role", 2, 60),
    interactionType: requireString(body.interactionType, "interactionType", 2, 60),
    imageUrl: optionalString(body.imageUrl, "imageUrl", 1, 255),
    description: optionalString(body.description, "description", 1, 500),
    dialogue: optionalString(body.dialogue, "dialogue", 1, 500),
    xpReward: optionalNumber(body.xpReward, "xpReward", { min: 0, max: 1_000_000 }),
    coinsReward: optionalNumber(body.coinsReward, "coinsReward", { min: 0, max: 1_000_000 }),
    rewardItemName: optionalString(body.rewardItemName, "rewardItemName", 1, 100),
    rewardItemCategory: optionalString(body.rewardItemCategory, "rewardItemCategory", 1, 60),
    rewardItemType: optionalString(body.rewardItemType, "rewardItemType", 1, 60),
    rewardItemImg: optionalString(body.rewardItemImg, "rewardItemImg", 1, 255),
    rewardItemEffect: optionalString(body.rewardItemEffect, "rewardItemEffect", 1, 255),
    rewardItemValue: optionalNumber(body.rewardItemValue, "rewardItemValue", {
      min: 0,
      max: 1_000_000,
    }),
    rewardItemQuantity: optionalNumber(body.rewardItemQuantity, "rewardItemQuantity", {
      min: 1,
      max: 999,
    }),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  req.body = parsed;
};

export const validateUpdateNpc = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateNpcInput = {
    name: optionalString(body.name, "name", 2, 100),
    role: optionalString(body.role, "role", 2, 60),
    interactionType: optionalString(body.interactionType, "interactionType", 2, 60),
    imageUrl: optionalString(body.imageUrl, "imageUrl", 1, 255),
    description: optionalString(body.description, "description", 1, 500),
    dialogue: optionalString(body.dialogue, "dialogue", 1, 500),
    xpReward: optionalNumber(body.xpReward, "xpReward", { min: 0, max: 1_000_000 }),
    coinsReward: optionalNumber(body.coinsReward, "coinsReward", { min: 0, max: 1_000_000 }),
    rewardItemName: optionalString(body.rewardItemName, "rewardItemName", 1, 100),
    rewardItemCategory: optionalString(body.rewardItemCategory, "rewardItemCategory", 1, 60),
    rewardItemType: optionalString(body.rewardItemType, "rewardItemType", 1, 60),
    rewardItemImg: optionalString(body.rewardItemImg, "rewardItemImg", 1, 255),
    rewardItemEffect: optionalString(body.rewardItemEffect, "rewardItemEffect", 1, 255),
    rewardItemValue: optionalNumber(body.rewardItemValue, "rewardItemValue", {
      min: 0,
      max: 1_000_000,
    }),
    rewardItemQuantity: optionalNumber(body.rewardItemQuantity, "rewardItemQuantity", {
      min: 1,
      max: 999,
    }),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  ensureHasFields(parsed, "npc");
  req.body = parsed;
};

export const validateCreateShopProduct = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateShopProductInput = {
    slug: requireString(body.slug, "slug", 2, 100),
    name: requireString(body.name, "name", 2, 100),
    description: optionalString(body.description, "description", 1, 500),
    category: requireString(body.category, "category", 2, 60),
    type: requireString(body.type, "type", 2, 60),
    img: requireString(body.img, "img", 1, 255),
    effect: optionalString(body.effect, "effect", 1, 255),
    levelRequirement: optionalNumber(body.levelRequirement, "levelRequirement", {
      min: 1,
      max: 999,
    }),
    assetKind: requireAssetKind(body.assetKind, "assetKind"),
    price: requirePositiveInt(body.price, "price", { min: 0, max: 1_000_000 }),
    currency: optionalString(body.currency, "currency", 2, 10),
    rewardCoins: optionalNumber(body.rewardCoins, "rewardCoins", { min: 0, max: 1_000_000 }),
    rewardQuantity: optionalNumber(body.rewardQuantity, "rewardQuantity", { min: 1, max: 999 }),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  req.body = parsed;
};

export const validateUpdateShopProduct = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateShopProductInput = {
    slug: optionalString(body.slug, "slug", 2, 100),
    name: optionalString(body.name, "name", 2, 100),
    description: optionalString(body.description, "description", 1, 500),
    category: optionalString(body.category, "category", 2, 60),
    type: optionalString(body.type, "type", 2, 60),
    img: optionalString(body.img, "img", 1, 255),
    effect: optionalString(body.effect, "effect", 1, 255),
    levelRequirement: optionalNumber(body.levelRequirement, "levelRequirement", {
      min: 1,
      max: 999,
    }),
    assetKind: optionalAssetKind(body.assetKind, "assetKind"),
    price: optionalNumber(body.price, "price", { min: 0, max: 1_000_000 }),
    currency: optionalString(body.currency, "currency", 2, 10),
    rewardCoins: optionalNumber(body.rewardCoins, "rewardCoins", { min: 0, max: 1_000_000 }),
    rewardQuantity: optionalNumber(body.rewardQuantity, "rewardQuantity", { min: 1, max: 999 }),
    isActive: parseBoolean(body.isActive, "isActive"),
  };

  ensureHasFields(parsed, "produto da loja");
  req.body = parsed;
};

const ensureHasFields = (value: Record<string, unknown>, entityName: string) => {
  const hasValue = Object.values(value).some((entry) => entry !== undefined);

  if (!hasValue) {
    throw new AppError(
      400,
      `Nenhum campo valido enviado para atualizar ${entityName}.`,
      "VALIDATION_ERROR"
    );
  }
};
