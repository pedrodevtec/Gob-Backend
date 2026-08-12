export type JsonSchema = Record<string, unknown>;

const conciseString = { type: "string" };

export const worldSummaryOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    suggestedTitle: conciseString,
    suggestedSummary: conciseString,
    suggestedTone: conciseString,
    suggestedRules: conciseString,
    suggestedCharacterCreationCriteria: conciseString,
  },
  required: [
    "suggestedTitle",
    "suggestedSummary",
    "suggestedTone",
    "suggestedRules",
    "suggestedCharacterCreationCriteria",
  ],
  additionalProperties: false,
};

const missionIdeaSchema: JsonSchema = {
  type: "object",
  properties: {
    title: conciseString,
    description: conciseString,
    objective: conciseString,
    rewardSuggestion: conciseString,
    consequenceSuggestion: conciseString,
  },
  required: [
    "title",
    "description",
    "objective",
    "rewardSuggestion",
    "consequenceSuggestion",
  ],
  additionalProperties: false,
};

export const missionIdeasOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: missionIdeaSchema,
    },
  },
  required: ["ideas"],
  additionalProperties: false,
};

const traitSchema: JsonSchema = {
  type: "object",
  properties: {
    name: conciseString,
    description: conciseString,
    category: conciseString,
    value: conciseString,
  },
  required: ["name", "description", "category", "value"],
  additionalProperties: false,
};

export const traitSuggestionsOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    positive: { type: "array", maxItems: 3, items: traitSchema },
    negative: { type: "array", maxItems: 3, items: traitSchema },
    neutral: { type: "array", maxItems: 3, items: traitSchema },
  },
  required: ["positive", "negative", "neutral"],
  additionalProperties: false,
};

export const timelineSummaryOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    suggestedTitle: conciseString,
    suggestedDescription: conciseString,
  },
  required: ["suggestedTitle", "suggestedDescription"],
  additionalProperties: false,
};

const playerCharacterSuggestionSchema: JsonSchema = {
  type: "object",
  properties: {
    targetField: conciseString,
    suggestion: conciseString,
    rationale: conciseString,
    playerAction: conciseString,
  },
  required: ["targetField", "suggestion", "rationale", "playerAction"],
  additionalProperties: false,
};

export const playerCharacterAssistantOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      maxItems: 5,
      items: playerCharacterSuggestionSchema,
    },
    warnings: {
      type: "array",
      maxItems: 3,
      items: conciseString,
    },
  },
  required: ["suggestions", "warnings"],
  additionalProperties: false,
};

const characterChapterSuggestionSchema: JsonSchema = {
  type: "object",
  properties: {
    targetField: conciseString,
    content: conciseString,
    rationale: conciseString,
    basedOn: {
      type: "array",
      maxItems: 5,
      items: conciseString,
    },
  },
  required: ["targetField", "content", "rationale", "basedOn"],
  additionalProperties: false,
};

export const characterChapterSuggestionsOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: characterChapterSuggestionSchema,
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
};

export const characterMechanicalProposalOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    archetypes: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: { key: conciseString, rationale: conciseString },
        required: ["key", "rationale"],
        additionalProperties: false,
      },
    },
    positiveTrait: conciseString,
    negativeTrait: conciseString,
    attributes: {
      type: "object",
      properties: {
        strength: { type: "integer" },
        agility: { type: "integer" },
        vigor: { type: "integer" },
        intellect: { type: "integer" },
        presence: { type: "integer" },
        spirit: { type: "integer" },
      },
      required: ["strength", "agility", "vigor", "intellect", "presence", "spirit"],
      additionalProperties: false,
    },
    trainings: { type: "array", minItems: 3, maxItems: 3, items: conciseString },
    equipment: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        properties: { slot: conciseString, name: conciseString, description: conciseString },
        required: ["slot", "name", "description"],
        additionalProperties: false,
      },
    },
    rationale: conciseString,
  },
  required: [
    "archetypes", "positiveTrait", "negativeTrait", "attributes",
    "trainings", "equipment", "rationale",
  ],
  additionalProperties: false,
};
