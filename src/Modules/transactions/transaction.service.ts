import prisma from "../../config/db";
import { CharacterService } from "../characters/character.service";

export class TransactionService {
  static async getByCharacter(userId: string, characterId: string) {
    await CharacterService.ensureOwnership(userId, characterId);

    return prisma.transaction.findMany({
      where: { characterId },
      orderBy: { createdAt: "desc" },
    });
  }
}
