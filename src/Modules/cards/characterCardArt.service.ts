import { AiUsageStatus, Prisma, TableMemberRole } from "@prisma/client";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { AiGateway } from "../ai/ai.gateway";
import { BuilderService } from "../builder/builder.service";
import { TableService } from "../tables/table.service";

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

  static async previewApprovedCharacterArtPrompt(userId: string, tableId: string, characterId: string) {
    const roleContext = await TableService.getTableRoleContext(tableId, userId);
    if (roleContext.role !== TableMemberRole.PLAYER) {
      throw new AppError(403, "Preview de carta restrito ao jogador dono.", "TABLE_PLAYER_REQUIRED");
    }

    const character = await this.db.character.findFirst({
      where: { id: characterId, tableId, userId },
      select: {
        id: true,
        userId: true,
        tableId: true,
        submissionSnapshots: {
          where: { approvedAt: { not: null } },
          orderBy: [{ approvedAt: "desc" }, { submittedAt: "desc" }, { id: "desc" }],
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

    const approvedSubmission = character.submissionSnapshots[0] ?? null;
    if (!approvedSubmission) {
      await AiGateway.recordInternalEvent({
        useCase: "CHARACTER_CARD_ART_PROMPT",
        userId,
        tableId,
        characterId,
        promptVersion: CHARACTER_CARD_ART_PROMPT_VERSION,
        provider: "internal",
        model: "prompt-builder",
        status: AiUsageStatus.ERROR,
        errorCode: "APPROVED_SUBMISSION_REQUIRED",
      });
      throw new AppError(409, "Personagem precisa de submissao aprovada para preparar carta.", "APPROVED_SUBMISSION_REQUIRED");
    }

    const snapshot = approvedSubmission.characterSnapshot as Prisma.JsonObject;
    const fields = this.buildPromptFields(snapshot, approvedSubmission.builderConfigVersion);
    const prompt = this.interpolate(fields);
    this.assertNoForbidden(prompt);

    const event = await AiGateway.recordInternalEvent({
      useCase: "CHARACTER_CARD_ART_PROMPT",
      userId,
      tableId,
      characterId,
      contextVersionId: approvedSubmission.contextVersionId,
      promptVersion: CHARACTER_CARD_ART_PROMPT_VERSION,
      provider: "internal",
      model: "prompt-builder",
    });

    return {
      promptVersion: CHARACTER_CARD_ART_PROMPT_VERSION,
      approvedSubmission: {
        id: approvedSubmission.id,
        sheetRevision: approvedSubmission.sheetRevision,
        approvedAt: approvedSubmission.approvedAt,
        builderConfigVersion: approvedSubmission.builderConfigVersion,
        contextVersionId: approvedSubmission.contextVersionId,
      },
      useCase: "CHARACTER_CARD_ART_PROMPT",
      usageEventId: event.id,
      provider: null,
      storage: null,
      pending: ["IMAGE_PROVIDER_NOT_CONFIGURED", "CARD_ART_STORAGE_NOT_CONFIGURED"],
      fields,
      prompt,
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
