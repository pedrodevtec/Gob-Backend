export const FINAL_SURVEY_VERSION = "pilot-v2";
export const ANALYTICS_METADATA_VERSION = "pilot-v1";

export const FINAL_SURVEY_QUESTIONS = [
  {
    questionKey: "character_understanding_score",
    prompt: "Ao terminar, voce conseguiu explicar quem e seu personagem e o que o move?",
    format: "SCALE_1_5",
    required: true,
  },
  {
    questionKey: "creation_experience_score",
    prompt: "Voce conseguiu avancar pela criacao sem ficar perdido ou sem saber o que responder?",
    format: "SCALE_1_5_FORM_TO_GAME",
    required: true,
  },
  {
    questionKey: "ai_helpfulness_score",
    prompt: "A ajuda criativa transformou suas ideias em sugestoes que voce conseguiu entender e avaliar?",
    format: "SCALE_1_5_OR_NOT_USED",
    required: true,
  },
  {
    questionKey: "ai_boundary_problem",
    prompt: "Em algum momento a ajuda criativa trouxe algo como definitivo ou tentou decidir por voce?",
    format: "BOOLEAN",
    required: true,
  },
  {
    questionKey: "ai_boundary_problem_details",
    prompt: "O que a ajuda sugeriu e por que isso nao combinou com sua escolha?",
    format: "OPTIONAL_TEXT",
    required: false,
    conditionalOn: "ai_boundary_problem",
  },
  {
    questionKey: "story_impact_score",
    prompt: "A ficha deixou ganchos que o Mestre podera aproveitar durante a aventura?",
    format: "SCALE_1_5",
    required: true,
  },
  {
    questionKey: "final_comment",
    prompt: "Qual foi a principal dificuldade ou melhoria que voce gostaria de ver?",
    format: "OPTIONAL_TEXT",
    required: false,
  },
] as const;

export const ANALYTICS_EVENT_KEYS = [
  "campaign_landing_viewed",
  "registration_started",
  "registration_completed",
  "email_verified",
  "consent_recorded",
  "campaign_joined",
  "public_context_viewed",
  "character_builder_started",
  "builder_step_completed",
  "character_draft_saved",
  "character_submitted",
  "final_survey_submitted",
  "pilot_flow_completed",
  "ai_suggestion_generated",
  "ai_suggestion_failed",
  "ai_suggestion_decided",
] as const;

export type AnalyticsEventKey = (typeof ANALYTICS_EVENT_KEYS)[number];
