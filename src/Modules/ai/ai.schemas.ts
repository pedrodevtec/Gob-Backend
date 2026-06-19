export type JsonSchema = Record<string, unknown>;

const conciseString = { type: "string" };

export const worldSummaryOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    suggestedTitle: conciseString,
    suggestedSummary: conciseString,
    suggestedTone: conciseString,
    suggestedRules: conciseString,
    suggestedCharacterCriteria: conciseString,
  },
  required: [
    "suggestedTitle",
    "suggestedSummary",
    "suggestedTone",
    "suggestedRules",
    "suggestedCharacterCriteria",
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
