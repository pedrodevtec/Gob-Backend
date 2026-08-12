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

export interface PlayerCharacterAssistantInput {
  useCase: "PLAYER_CHARACTER_CREATION" | "PLAYER_CHARACTER_VALIDATION";
  characterId?: string;
  instruction?: string;
}

export interface PlayerCharacterAssistantSuggestion {
  id?: string;
  targetField: string;
  suggestion: string;
  rationale: string;
  playerAction: string;
}

export interface PlayerCharacterAssistantOutput {
  suggestions: PlayerCharacterAssistantSuggestion[];
  warnings: string[];
}

export interface DecidePlayerAiSuggestionInput {
  decision: "ACCEPTED" | "EDITED" | "DISCARDED";
  editedSuggestion?: string;
  appliedContent?: string;
}

export interface CharacterChapterSuggestionInput {
  targetChapter: "STORY";
  targetFields: string[];
  expectedRevision: number;
  playerIntent?: string;
}

export interface CharacterChapterSuggestion {
  id?: string;
  targetField: string;
  content: string;
  rationale: string;
  basedOn: string[];
  status: "GENERATED";
}

export interface CharacterChapterSuggestionOutput {
  suggestions: CharacterChapterSuggestion[];
  characterRevision: number;
  promptVersion: string;
  cached: boolean;
}

export interface CharacterMechanicalProposalInput {
  expectedRevision: number;
}

export interface CharacterMechanicalProposal {
  id?: string;
  archetypes: Array<{ key: string; rationale: string }>;
  positiveTrait: string;
  negativeTrait: string;
  attributes: Record<string, number>;
  trainings: string[];
  equipment: Array<{ slot: string; name: string; description?: string }>;
  rationale: string;
  characterRevision: number;
  promptVersion: string;
}
