export interface WorldSummaryInput {
  prompt?: string;
  currentWorld?: {
    title?: string;
    summary?: string;
    tone?: string;
    rules?: string;
    characterCreationCriteria?: string;
  };
}

export interface MissionIdeaCharacterInput {
  name?: string;
  className?: string;
  summary?: string;
}

export interface MissionIdeasInput {
  theme?: string;
  difficulty?: string;
  worldSummary: string;
  activeArc?: string;
  characters: MissionIdeaCharacterInput[];
}

export interface TraitSuggestionsInput {
  characterId: string;
  instruction?: string;
}

export interface TimelineSummaryInput {
  notes: string;
  eventType: "SESSION_SUMMARY" | "MASTER_NOTE";
}

export interface WorldSummarySuggestion {
  suggestedTitle: string;
  suggestedSummary: string;
  suggestedTone: string;
  suggestedRules: string;
  suggestedCharacterCreationCriteria: string;
}

export interface MissionIdeasSuggestion {
  ideas: Array<{
    title: string;
    description: string;
    objective: string;
    rewardSuggestion: string;
    consequenceSuggestion: string;
  }>;
}

export interface TraitSuggestion {
  name: string;
  description: string;
  category: string;
  value: string;
}

export interface TraitSuggestions {
  positive: TraitSuggestion[];
  negative: TraitSuggestion[];
  neutral: TraitSuggestion[];
}

export interface TimelineSummarySuggestion {
  suggestedTitle: string;
  suggestedDescription: string;
}
