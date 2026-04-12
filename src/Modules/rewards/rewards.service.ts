import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { getLevelFromXp } from "../characters/character.progression";
import { CharacterService } from "../characters/character.service";
import { ClaimRewardInput } from "./rewards.types";

export class RewardsService {
  static async claim(userId: string, input: ClaimRewardInput) {
    const character = await CharacterService.ensureOwnership(userId, input.characterId);

    const existing = await prisma.rewardClaim.findUnique({
      where: { claimKey: input.claimKey },
    });

    if (existing) {
      throw new AppError(409, "Recompensa ja resgatada com essa claimKey.", "REWARD_ALREADY_CLAIMED");
    }

    return prisma.$transaction(async (tx) => {
      if (input.type === "XP") {
        const nextXp = character.xp + input.value;
        const nextLevel = Math.max(character.level, getLevelFromXp(nextXp));

        await tx.character.update({
          where: { id: input.characterId },
          data: {
            xp: nextXp,
            level: nextLevel,
          },
        });
      } else {
        const inventory = await tx.inventory.findFirst({
          where: { characterId: input.characterId },
        });

        if (!inventory) {
          throw new AppError(404, "Inventario nao encontrado para recompensa.", "INVENTORY_NOT_FOUND");
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            coins: {
              increment: input.value,
            },
          },
        });
      }

      const rewardClaim = await tx.rewardClaim.create({
        data: {
          characterId: input.characterId,
          claimKey: input.claimKey,
          type: input.type,
          value: input.value,
          metadata: input.metadata,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          characterId: input.characterId,
          type: `REWARD_${input.type}`,
          value: input.value,
        },
      });

      return {
        rewardClaim,
        transaction,
      };
    });
  }

  static async listClaims(userId: string, characterId: string) {
    await CharacterService.ensureOwnership(userId, characterId);

    return prisma.rewardClaim.findMany({
      where: { characterId },
      orderBy: { claimedAt: "desc" },
    });
  }
}
