import { AppError } from "../../errors/AppError";
import {
  NARRATIVE_ASSISTED_V1_BUILDER_CONFIG,
  OFFICIAL_BUILDER_CONFIGS,
} from "./builder.config";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class BuilderService {
  static getActiveConfig() {
    return NARRATIVE_ASSISTED_V1_BUILDER_CONFIG;
  }

  static getConfig(version: string) {
    const config = OFFICIAL_BUILDER_CONFIGS[version as keyof typeof OFFICIAL_BUILDER_CONFIGS];

    if (!config) {
      throw new AppError(404, "Configuracao do Builder nao encontrada.", "BUILDER_CONFIG_NOT_FOUND");
    }

    return config;
  }

  static normalizeArchetypeKey(value: string, version?: string) {
    const config = version ? this.getConfig(version) : this.getActiveConfig();
    const allowed = new Set(config.archetypes.options.map((option) => option.key));

    if (!allowed.has(value)) {
      throw new AppError(400, "Arquetipo invalido para a configuracao do Builder.", "INVALID_BUILDER_ARCHETYPE");
    }

    return value;
  }

  static normalizeAttributes(value: unknown, version?: string): Record<string, number> {
    const config = version ? this.getConfig(version) : this.getActiveConfig();
    const allowedKeys = config.attributes.options.map((option) => option.key);

    if (!isRecord(value)) {
      throw new AppError(400, "attributes deve ser objeto com os atributos oficiais.", "INVALID_CHARACTER_ATTRIBUTES");
    }

    const entries = Object.entries(value);
    const incomingKeys = entries.map(([key]) => key);
    const missingKeys = allowedKeys.filter((key) => !incomingKeys.includes(key));
    const unknownKeys = incomingKeys.filter((key) => !allowedKeys.includes(key));

    if (missingKeys.length || unknownKeys.length || entries.length !== allowedKeys.length) {
      throw new AppError(
        400,
        "attributes deve conter exatamente os atributos oficiais do Builder.",
        "INVALID_CHARACTER_ATTRIBUTES",
        { missingKeys, unknownKeys }
      );
    }

    const normalized: Record<string, number> = {};
    for (const [key, rawValue] of entries) {
      if (
        typeof rawValue !== "number" ||
        !Number.isInteger(rawValue) ||
        rawValue < config.attributes.minValue ||
        rawValue > config.attributes.pilotSelectableMax
      ) {
        throw new AppError(
          400,
          "Valor de atributo invalido para o piloto.",
          "INVALID_CHARACTER_ATTRIBUTES"
        );
      }

      normalized[key] = rawValue;
    }

    const total = Object.values(normalized).reduce((sum, value) => sum + value, 0);
    if (total !== config.attributes.totalPoints) {
      throw new AppError(
        400,
        "A distribuicao de atributos deve somar exatamente 12 pontos.",
        "INVALID_CHARACTER_ATTRIBUTES_TOTAL",
        { expectedTotal: config.attributes.totalPoints, actualTotal: total }
      );
    }

    const hasRequiredSurvivability = config.attributes.requireAtLeastOneOf.every((rule) =>
      rule.keys.some((key) => (normalized[key] ?? 0) >= rule.minValue)
    );
    if (!hasRequiredSurvivability) {
      throw new AppError(
        400,
        "Pelo menos Vigor ou Espirito deve possuir valor 1 ou superior.",
        "INVALID_CHARACTER_ATTRIBUTES_REQUIREMENT"
      );
    }

    return normalized;
  }

  static normalizeSuggestedAttributes(value: unknown, version?: string): Record<string, number> {
    const config = version ? this.getConfig(version) : this.getActiveConfig();
    const allowedKeys = config.attributes.options.map((option) => option.key);

    if (!isRecord(value)) {
      throw new AppError(
        502,
        "A sugestao de atributos retornada pela IA e invalida.",
        "INVALID_AI_MECHANICAL_PROPOSAL"
      );
    }

    const incomingKeys = Object.keys(value);
    const missingKeys = allowedKeys.filter((key) => !incomingKeys.includes(key));
    const unknownKeys = incomingKeys.filter((key) => !allowedKeys.includes(key));
    if (missingKeys.length || unknownKeys.length || incomingKeys.length !== allowedKeys.length) {
      throw new AppError(
        502,
        "A sugestao de atributos retornada pela IA esta incompleta.",
        "INVALID_AI_MECHANICAL_PROPOSAL",
        { missingKeys, unknownKeys }
      );
    }

    const normalized: Record<string, number> = {};
    for (const key of allowedKeys) {
      const rawValue = value[key];
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        throw new AppError(
          502,
          "A sugestao de atributos retornada pela IA e invalida.",
          "INVALID_AI_MECHANICAL_PROPOSAL"
        );
      }
      normalized[key] = Math.min(
        config.attributes.pilotSelectableMax,
        Math.max(config.attributes.minValue, Math.round(rawValue))
      );
    }

    const targetTotal = config.attributes.totalPoints;
    let currentTotal = Object.values(normalized).reduce((sum, attribute) => sum + attribute, 0);
    let remainingIterations = allowedKeys.length * targetTotal;

    while (currentTotal < targetTotal && remainingIterations > 0) {
      const candidate = [...allowedKeys]
        .filter((key) => normalized[key] < config.attributes.pilotSelectableMax)
        .sort((left, right) => normalized[right] - normalized[left])[0];
      if (!candidate) break;
      normalized[candidate] += 1;
      currentTotal += 1;
      remainingIterations -= 1;
    }

    while (currentTotal > targetTotal && remainingIterations > 0) {
      const candidate = [...allowedKeys]
        .filter((key) => normalized[key] > config.attributes.minValue)
        .sort((left, right) => normalized[right] - normalized[left])[0];
      if (!candidate) break;
      normalized[candidate] -= 1;
      currentTotal -= 1;
      remainingIterations -= 1;
    }

    for (const rule of config.attributes.requireAtLeastOneOf) {
      if (rule.keys.some((key) => (normalized[key] ?? 0) >= rule.minValue)) continue;

      const targetKey = [...rule.keys]
        .filter((key) => allowedKeys.includes(key))
        .sort((left, right) => (normalized[right] ?? 0) - (normalized[left] ?? 0))[0];
      if (!targetKey) continue;

      let pointsNeeded = rule.minValue - (normalized[targetKey] ?? 0);
      const donors = [...allowedKeys]
        .filter((key) => key !== targetKey)
        .sort((left, right) => normalized[right] - normalized[left]);

      for (const donor of donors) {
        while (pointsNeeded > 0 && normalized[donor] > config.attributes.minValue) {
          normalized[donor] -= 1;
          normalized[targetKey] += 1;
          pointsNeeded -= 1;
        }
        if (pointsNeeded === 0) break;
      }
    }

    return this.normalizeAttributes(normalized, config.version);
  }

  static normalizeTrainings(value: unknown, version?: string): string[] {
    const config = version ? this.getConfig(version) : this.getActiveConfig();
    const allowed = new Set(config.trainings.options.map((option) => option.key));

    if (!Array.isArray(value) || value.length !== config.trainings.selection.exact) {
      throw new AppError(
        400,
        "trainings deve conter exatamente tres treinamentos.",
        "INVALID_CHARACTER_TRAININGS"
      );
    }

    const normalized = value.map((entry) => {
      if (typeof entry !== "string") {
        throw new AppError(400, "Treinamento invalido.", "INVALID_CHARACTER_TRAININGS");
      }

      const key = entry.trim().toLowerCase();
      if (!allowed.has(key)) {
        throw new AppError(400, "Treinamento nao existe na configuracao oficial.", "INVALID_CHARACTER_TRAINING_KEY");
      }

      return key;
    });

    if (new Set(normalized).size !== normalized.length) {
      throw new AppError(409, "Treinos duplicados nao sao permitidos.", "DUPLICATE_CHARACTER_TRAINING");
    }

    return normalized;
  }

  static validateInitialEquipment(value: unknown, version?: string): void {
    const config = version ? this.getConfig(version) : this.getActiveConfig();
    const allowedSlots = new Set(config.equipment.slots.map((slot) => slot.key));

    if (!Array.isArray(value) || value.length < config.equipment.minInitialItems || value.length > 10) {
      throw new AppError(
        400,
        "initialEquipment deve conter pelo menos um item inicial.",
        "INVALID_CHARACTER_EQUIPMENT"
      );
    }

    const usedSlots = new Set<string>();
    for (const entry of value) {
      if (typeof entry === "string") {
        if (!entry.trim()) {
          throw new AppError(400, "Equipamento inicial invalido.", "INVALID_CHARACTER_EQUIPMENT");
        }
        continue;
      }

      if (!isRecord(entry)) {
        throw new AppError(400, "Equipamento inicial invalido.", "INVALID_CHARACTER_EQUIPMENT");
      }

      const slotKey = entry.slotKey ?? entry.slot;
      if (slotKey !== undefined) {
        if (typeof slotKey !== "string" || !allowedSlots.has(slotKey)) {
          throw new AppError(400, "Slot de equipamento invalido.", "INVALID_CHARACTER_EQUIPMENT_SLOT");
        }
        if (usedSlots.has(slotKey)) {
          throw new AppError(409, "Cada slot de equipamento aceita no maximo um item.", "DUPLICATE_EQUIPMENT_SLOT");
        }
        usedSlots.add(slotKey);
      }
    }
  }

  static getRequiredEpisodeQuestionKeys(version?: string): string[] {
    const config = version ? this.getConfig(version) : this.getActiveConfig();
    return config.episodeQuestions.questions
      .filter((question) => question.required)
      .map((question) => question.questionKey);
  }

  static getEpisodeQuestion(questionKey: string, version?: string) {
    const config = version ? this.getConfig(version) : this.getActiveConfig();
    const question = config.episodeQuestions.questions.find(
      (entry) => entry.questionKey === questionKey
    );

    if (!question) {
      throw new AppError(
        400,
        "Pergunta de episodio nao existe na configuracao oficial.",
        "INVALID_EPISODE_QUESTION_KEY"
      );
    }

    return question;
  }

  static buildEpisodeQuestionSnapshot(questionKey: string, version?: string): string {
    const config = version ? this.getConfig(version) : this.getActiveConfig();
    const question = this.getEpisodeQuestion(questionKey, config.version);
    return JSON.stringify({
      builderConfigVersion: config.version,
      questionVersion: question.version,
      prompt: question.prompt,
    });
  }

  static calculateDerivedResources(attributes: unknown, version?: string) {
    if (!isRecord(attributes)) {
      return null;
    }

    const vigor = typeof attributes.vigor === "number" ? attributes.vigor : null;
    const spirit = typeof attributes.spirit === "number" ? attributes.spirit : null;
    if (vigor === null || spirit === null) {
      return null;
    }

    return {
      builderConfigVersion: version ?? this.getActiveConfig().version,
      hp: 10 + vigor * 4,
      energy: 6 + vigor + spirit,
      ascensionPoints: 2 + spirit,
    };
  }
}
