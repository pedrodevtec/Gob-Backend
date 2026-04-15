import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { MissionJourneyDefinition, MissionJourneyNode } from "./gameplay.types";

type MissionRecord = {
  id: string;
  title: string;
  description: string | null;
  journey: Prisma.JsonValue | null;
  startDialogue: string | null;
  completionDialogue: string | null;
  completionNpcId: string | null;
  enemyName: string;
  enemyLevel: number;
  enemyHealth: number;
  enemyAttack: number;
  enemyDefense: number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNodeType = (value: unknown): value is MissionJourneyNode["type"] =>
  typeof value === "string" &&
  ["DIALOGUE", "CHOICE", "COMBAT", "RETURN_TO_NPC", "COMPLETE"].includes(value);

const parseNode = (value: unknown): MissionJourneyNode | null => {
  if (!isObject(value) || !isNodeType(value.type) || typeof value.id !== "string") {
    return null;
  }

  return {
    id: value.id,
    type: value.type,
    title: typeof value.title === "string" ? value.title : undefined,
    text: typeof value.text === "string" ? value.text : undefined,
    nextNodeId: typeof value.nextNodeId === "string" ? value.nextNodeId : undefined,
    npcId: typeof value.npcId === "string" ? value.npcId : undefined,
    enemy:
      isObject(value.enemy) &&
      typeof value.enemy.name === "string" &&
      typeof value.enemy.level === "number" &&
      typeof value.enemy.health === "number" &&
      typeof value.enemy.attack === "number" &&
      typeof value.enemy.defense === "number"
        ? {
            name: value.enemy.name,
            imageUrl: typeof value.enemy.imageUrl === "string" ? value.enemy.imageUrl : undefined,
            level: value.enemy.level,
            health: value.enemy.health,
            attack: value.enemy.attack,
            defense: value.enemy.defense,
          }
        : undefined,
    choices: Array.isArray(value.choices)
      ? value.choices
          .map((choice) => {
            if (
              !isObject(choice) ||
              typeof choice.id !== "string" ||
              typeof choice.label !== "string" ||
              typeof choice.nextNodeId !== "string"
            ) {
              return null;
            }

            return {
              id: choice.id,
              label: choice.label,
              description: typeof choice.description === "string" ? choice.description : undefined,
              nextNodeId: choice.nextNodeId,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      : undefined,
  };
};

export const normalizeMissionJourney = (mission: MissionRecord): MissionJourneyDefinition => {
  if (mission.journey) {
    const value = mission.journey as Prisma.JsonObject;

    if (!isObject(value) || typeof value.startNodeId !== "string" || !Array.isArray(value.nodes)) {
      throw new AppError(500, "Jornada da missao invalida.", "MISSION_JOURNEY_INVALID");
    }

    const nodes = value.nodes
      .map((entry) => parseNode(entry))
      .filter((entry): entry is MissionJourneyNode => Boolean(entry));

    return {
      startNodeId: value.startNodeId,
      nodes,
    };
  }

  return {
    startNodeId: "intro",
    nodes: [
      {
        id: "intro",
        type: "DIALOGUE",
        title: mission.title,
        text: mission.startDialogue ?? mission.description ?? mission.title,
        nextNodeId: "combat",
      },
      {
        id: "combat",
        type: "COMBAT",
        text: `Enfrente ${mission.enemyName}.`,
        enemy: {
          name: mission.enemyName,
          level: mission.enemyLevel,
          health: mission.enemyHealth,
          attack: mission.enemyAttack,
          defense: mission.enemyDefense,
        },
        nextNodeId: mission.completionNpcId ? "turn-in" : "complete",
      },
      ...((mission.completionNpcId
        ? [
            {
              id: "turn-in",
              type: "RETURN_TO_NPC" as const,
              text: mission.completionDialogue ?? "Retorne ao NPC para receber sua recompensa.",
              npcId: mission.completionNpcId,
              nextNodeId: "complete",
            },
          ]
        : []) as MissionJourneyNode[]),
      {
        id: "complete",
        type: "COMPLETE",
        text: mission.completionDialogue ?? "Missao concluida.",
      },
    ],
  };
};

export const getMissionNodeById = (
  journey: MissionJourneyDefinition,
  nodeId: string
): MissionJourneyNode => {
  const node = journey.nodes.find((entry) => entry.id === nodeId);

  if (!node) {
    throw new AppError(500, "No da jornada nao encontrado.", "MISSION_NODE_NOT_FOUND");
  }

  return node;
};
