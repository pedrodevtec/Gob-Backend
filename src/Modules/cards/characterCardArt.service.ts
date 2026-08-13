import { AccountRole, AiUsageStatus, Prisma, TableMemberRole } from "@prisma/client";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { AiGateway } from "../ai/ai.gateway";
import { BuilderService } from "../builder/builder.service";
import { TableService } from "../tables/table.service";
import { env } from "../../config/env";
import { AiClient } from "../ai/ai.client";

type CardArtDb = typeof defaultPrisma;

export const CHARACTER_CARD_ART_PROMPT_VERSION = "character-card-art-v1";

const CARD_ART_TEMPLATE = `Crie exclusivamente a ilustracao de um personagem para uma carta de Guardian of Bravantus. Nao desenhe moldura, logotipo, numeros, letras ou textos.

PERSONAGEM

Nome de referencia, nao escrever na imagem:
{{name}}

Conceito:
{{concept}}

Origem:
{{origin}}

Aparencia fisica:
{{appearance}}

Arquetipo:
{{archetypeName}}

Marca:

* Local: {{markLocation}}
* Aparencia: {{markAppearance}}
* Reacao visual: {{markReaction}}

Caracteristicas:

* Trait positiva: {{positiveTrait}}
* Trait negativa: {{negativeTrait}}

Equipamentos visiveis:
{{equipmentSummary}}

DIRECAO VISUAL

Fantasia heroica medieval autoral, detalhada e cinematografica.
Atmosfera antiga, protetora, mistica e levemente melancolica.
Paleta de verde profundo, dourado envelhecido, marrom escuro, cinza de tempestade e luzes discretas relacionadas a Marca.

Composicao vertical adequada para uma carta de 63 x 88 mm.
Personagem como foco principal, silhueta legivel e fundo narrativo discreto.
Nao inventar simbolos, poderes, equipamentos ou detalhes nao sustentados pelas informacoes fornecidas.
Nao incluir texto, assinatura, marca d'agua, moldura ou interface.`;

const FORBIDDEN_MARKERS = [
  "gm_secret",
  "SECRET_CANON",
  "TABLE_MASTER",
  "AUTHOR_ADMIN",
  "Zurich",
  "Mandukuru",
  "Erya",
];

export class CharacterCardArtService {
  private static db: CardArtDb = defaultPrisma;

  static setDbForTests(db: CardArtDb): void {
    this.db = db;
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
  }

  static async previewSubmittedCharacterArtPrompt(userId: string, tableId: string, characterId: string) {
    const roleContext = await TableService.getTableRoleContext(tableId, userId);
    const account = await this.db.user.findUnique({ where: { id: userId }, select: { accountRole: true } });
    if (roleContext.role !== TableMemberRole.PLAYER && account?.accountRole !== AccountRole.ADMIN) {
      throw new AppError(403, "Preview de carta restrito ao jogador dono.", "TABLE_PLAYER_REQUIRED");
    }

    const character = await this.db.character.findFirst({
      where: { id: characterId, tableId, userId },
      select: {
        id: true,
        userId: true,
        tableId: true,
        table: { select: { publicCampaign: { select: { id: true } } } },
        submissionSnapshots: {
          orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            sheetRevision: true,
            builderConfigVersion: true,
            contextVersionId: true,
            characterSnapshot: true,
            approvedAt: true,
          },
        },
      },
    });
    if (!character) {
      throw new AppError(404, "Personagem nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
    }

    const submittedSnapshot = character.submissionSnapshots[0] ?? null;
    if (!submittedSnapshot) {
      await AiGateway.recordInternalEvent({
        useCase: "CHARACTER_CARD_ART_PROMPT",
        userId,
        tableId,
        characterId,
        promptVersion: CHARACTER_CARD_ART_PROMPT_VERSION,
        provider: "internal",
        model: "prompt-builder",
        status: AiUsageStatus.ERROR,
        errorCode: "CHARACTER_SUBMISSION_REQUIRED",
      });
      throw new AppError(409, "Personagem precisa ser enviado antes de preparar a imagem.", "CHARACTER_SUBMISSION_REQUIRED");
    }

    const campaignId = character.table?.publicCampaign?.id;
    const survey = campaignId
      ? await this.db.finalSurveyResponse.findUnique({
          where: { userId_campaignId: { userId, campaignId } },
          select: { id: true },
        })
      : null;
    if (!survey) {
      throw new AppError(409, "Conclua a pesquisa antes de preparar a imagem.", "FINAL_SURVEY_REQUIRED");
    }

    const snapshot = submittedSnapshot.characterSnapshot as Prisma.JsonObject;
    const fields = this.buildPromptFields(snapshot, submittedSnapshot.builderConfigVersion);
    const prompt = this.interpolate(fields);
    this.assertNoForbidden(prompt);

    const event = await AiGateway.recordInternalEvent({
      useCase: "CHARACTER_CARD_ART_PROMPT",
      userId,
      tableId,
      characterId,
      contextVersionId: submittedSnapshot.contextVersionId,
      promptVersion: CHARACTER_CARD_ART_PROMPT_VERSION,
      provider: "internal",
      model: "prompt-builder",
    });

    return {
      promptVersion: CHARACTER_CARD_ART_PROMPT_VERSION,
      sourceSubmission: {
        id: submittedSnapshot.id,
        sheetRevision: submittedSnapshot.sheetRevision,
        approvedAt: submittedSnapshot.approvedAt,
        builderConfigVersion: submittedSnapshot.builderConfigVersion,
        contextVersionId: submittedSnapshot.contextVersionId,
      },
      useCase: "CHARACTER_CARD_ART_PROMPT",
      usageEventId: event.id,
      provider: "openai",
      storage: "database",
      generationLimit: 1,
      pending: [],
      fields,
      prompt,
    };
  }

  static async listGenerations(userId: string, tableId: string, characterId: string) {
    await this.requireOwnedCharacter(userId, tableId, characterId);
    const items = await this.db.characterCardArtGeneration.findMany({
      where: { userId, tableId, characterId, status: "SUCCESS", imageData: { not: null } },
      orderBy: [{ attemptNumber: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        attemptNumber: true,
        promptVersion: true,
        provider: true,
        model: true,
        mimeType: true,
        createdAt: true,
        completedAt: true,
      },
    });
    return {
      limit: 1,
      remaining: Math.max(0, 1 - items.length),
      items: items.map((item) => this.formatGeneration(item, tableId, characterId)),
    };
  }

  static async generate(userId: string, tableId: string, characterId: string) {
    const preview = await this.previewSubmittedCharacterArtPrompt(userId, tableId, characterId);
    const sourceSubmission = preview.sourceSubmission;
    const activeCount = await this.db.characterCardArtGeneration.count({
      where: { userId, tableId, characterId, status: { in: ["PENDING", "SUCCESS"] } },
    });
    if (activeCount >= 1) {
      throw new AppError(409, "Este personagem ja possui uma carta gerada.", "CARD_ART_LIMIT_REACHED");
    }
    const last = await this.db.characterCardArtGeneration.findFirst({
      where: { characterId },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });
    const attemptNumber = (last?.attemptNumber ?? 0) + 1;
    const reservation = await this.db.characterCardArtGeneration.create({
      data: {
        characterId,
        submissionSnapshotId: sourceSubmission.id,
        userId,
        tableId,
        attemptNumber,
        promptVersion: preview.promptVersion,
        prompt: preview.prompt,
      },
      select: { id: true },
    }).catch(() => {
      throw new AppError(409, "Outra imagem ja esta sendo preparada. Aguarde antes de tentar novamente.", "CARD_ART_GENERATION_IN_PROGRESS");
    });

    try {
      const generated = await AiClient.generateImage({ prompt: preview.prompt, model: env.AI_IMAGE_MODEL });
      const usageEvent = await AiGateway.recordInternalEvent({
        useCase: "CHARACTER_CARD_ART_GENERATION",
        userId,
        tableId,
        characterId,
        contextVersionId: sourceSubmission.contextVersionId,
        promptVersion: preview.promptVersion,
        provider: generated.provider,
        model: generated.model,
        imageCount: 1,
      });
      const saved = await this.db.characterCardArtGeneration.update({
        where: { id: reservation.id },
        data: {
          status: "SUCCESS",
          provider: generated.provider,
          model: generated.model,
          mimeType: generated.mimeType,
          imageData: generated.data,
          aiUsageEventId: usageEvent.id,
          completedAt: new Date(),
        },
        select: {
          id: true,
          attemptNumber: true,
          promptVersion: true,
          provider: true,
          model: true,
          mimeType: true,
          createdAt: true,
          completedAt: true,
        },
      });
      return this.formatGeneration(saved, tableId, characterId);
    } catch (error) {
      await this.db.characterCardArtGeneration.delete({ where: { id: reservation.id } }).catch(() => undefined);
      await AiGateway.recordInternalEvent({
        useCase: "CHARACTER_CARD_ART_GENERATION",
        userId,
        tableId,
        characterId,
        contextVersionId: sourceSubmission.contextVersionId,
        promptVersion: preview.promptVersion,
        provider: "openai",
        model: env.AI_IMAGE_MODEL,
        status: AiUsageStatus.ERROR,
        errorCode: error instanceof AppError ? error.code : "AI_IMAGE_GENERATION_FAILED",
      }).catch(() => undefined);
      throw error;
    }
  }

  static async getGenerationContent(userId: string, tableId: string, characterId: string, generationId: string) {
    await this.requireOwnedCharacter(userId, tableId, characterId);
    const generation = await this.db.characterCardArtGeneration.findFirst({
      where: { id: generationId, userId, tableId, characterId, status: "SUCCESS" },
      select: { imageData: true, mimeType: true },
    });
    if (!generation?.imageData || !generation.mimeType) {
      throw new AppError(404, "Imagem do personagem nao encontrada.", "CARD_ART_NOT_FOUND");
    }
    return { data: Buffer.from(generation.imageData), mimeType: generation.mimeType };
  }

  private static async requireOwnedCharacter(userId: string, tableId: string, characterId: string) {
    await TableService.getTableRoleContext(tableId, userId);
    const character = await this.db.character.findFirst({
      where: { id: characterId, tableId, userId },
      select: { id: true },
    });
    if (!character) {
      throw new AppError(404, "Personagem nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
    }
    return character;
  }

  private static formatGeneration(generation: {
    id: string;
    attemptNumber: number;
    promptVersion: string;
    provider: string | null;
    model: string | null;
    mimeType: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }, tableId: string, characterId: string) {
    return {
      ...generation,
      imagePath: `/api/v1/tables/${tableId}/characters/${characterId}/card-art/${generation.id}/content`,
    };
  }

  private static buildPromptFields(snapshot: Prisma.JsonObject, builderConfigVersion: string) {
    const config = BuilderService.getConfig(builderConfigVersion);
    const archetype = config.archetypes.options.find((entry) => entry.key === snapshot.archetypeKey);

    return {
      name: this.safeText(snapshot.name),
      concept: this.safeText(snapshot.concept),
      origin: this.safeText(snapshot.origin),
      appearance: this.safeText(snapshot.appearance),
      archetypeName: this.safeText(archetype?.name ?? snapshot.archetypeKey),
      markLocation: this.safeText(snapshot.markLocation),
      markAppearance: this.safeText(snapshot.markAppearance),
      markReaction: this.safeText(snapshot.markReaction),
      positiveTrait: this.summarizeJsonText(snapshot.positiveTrait),
      negativeTrait: this.summarizeJsonText(snapshot.negativeTrait),
      equipmentSummary: this.summarizeEquipment(snapshot.initialEquipment),
    };
  }

  private static interpolate(fields: Record<string, string>): string {
    return CARD_ART_TEMPLATE.replace(/\{\{([a-zA-Z0-9]+)\}\}/g, (_match, key) => fields[key] ?? "Nao informado");
  }

  private static safeText(value: unknown): string {
    const text = typeof value === "string" ? value : "";
    return text
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600) || "Nao informado";
  }

  private static summarizeJsonText(value: unknown): string {
    if (typeof value === "string") {
      return this.safeText(value);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return "Nao informado";
    }
    const object = value as Record<string, unknown>;
    return this.safeText(object.text ?? object.value ?? object.name ?? JSON.stringify(object));
  }

  private static summarizeEquipment(value: unknown): string {
    if (!Array.isArray(value)) {
      return "Nao informado";
    }
    return value
      .map((entry) => {
        if (typeof entry === "string") return this.safeText(entry);
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        const object = entry as Record<string, unknown>;
        return this.safeText(object.name ?? object.text);
      })
      .filter(Boolean)
      .slice(0, 8)
      .join("; ") || "Nao informado";
  }

  private static assertNoForbidden(value: string): void {
    for (const marker of FORBIDDEN_MARKERS) {
      if (value.toLowerCase().includes(marker.toLowerCase())) {
        throw new AppError(500, "Prompt visual bloqueado por conter dado protegido.", "CARD_ART_SECRET_LEAK_BLOCKED");
      }
    }
  }
}
