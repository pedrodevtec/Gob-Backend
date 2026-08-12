export interface BuilderOption {
  key: string;
  name: string;
}

export interface BuilderTextSuggestion {
  value: string;
}

export interface BuilderAttribute extends BuilderOption {
  min: number;
  maxInitialWithoutApproval: number;
  pilotSelectableMax: number;
}

export interface BuilderEpisodeQuestion {
  questionKey: string;
  version: string;
  prompt: string;
  required: boolean;
}

export interface CharacterBuilderConfig {
  version: "pilot-v1" | "narrative-assisted-v1";
  status: "APPROVED";
  approvedBy: "PRODUCT_OWNER";
  scope: string[];
  archetypes: {
    classification: "RULE";
    selection: { exact: number };
    options: BuilderOption[];
    sourceNotes: string[];
  };
  attributes: {
    classification: "RULE";
    totalPoints: number;
    minValue: number;
    maxInitialWithoutApproval: number;
    pilotSelectableMax: number;
    requireAtLeastOneOf: Array<{ keys: string[]; minValue: number }>;
    options: BuilderAttribute[];
    derivedResources: Array<{
      key: string;
      name: string;
      backendCalculated: true;
      formula: string;
    }>;
  };
  trainings: {
    classification: "RULE";
    selection: { exact: number; distinct: true };
    bonus: number;
    options: BuilderOption[];
  };
  traitsAndBond: {
    classification: "RULE_AND_PRODUCT_DECISION";
    required: {
      positiveTrait: true;
      negativeTrait: true;
      narrativeBond: true;
    };
    suggestedPositiveTraits: BuilderTextSuggestion[];
    suggestedNegativeTraits: BuilderTextSuggestion[];
    suggestedBonds: BuilderTextSuggestion[];
    rules: string[];
  };
  equipment: {
    classification: "RULE_AND_PRODUCT_DECISION";
    minInitialItems: number;
    slots: BuilderOption[];
    rules: string[];
  };
  episodeQuestions: {
    classification: "PUBLIC_CANON_AND_RULE";
    requiredBeforeSubmission: boolean;
    questions: BuilderEpisodeQuestion[];
    rules: string[];
  };
  narrativeFlow?: {
    classification: "PRODUCT_DECISION";
    visibleSteps: number;
    questions: Array<{
      key: "before_mark" | "motivation_and_bonds" | "mark_change";
      prompt: string;
      helper: string;
      required: true;
    }>;
    confirmationBlocks: Array<"identity" | "motivations" | "mark">;
    requiredConfirmedFields: string[];
    playStyleOptions: Array<{ key: string; name: string; description: string }>;
  };
  aiBoundaries: string[];
}
