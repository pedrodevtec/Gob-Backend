export const FINAL_SURVEY_VERSION = "pilot-v1";
export const ANALYTICS_METADATA_VERSION = "pilot-v1";

export const FINAL_SURVEY_QUESTIONS = [
  {
    questionKey: "character_understanding_score",
    prompt: "Voce entendeu quem era seu personagem e por que ele participaria do episodio?",
    format: "SCALE_1_5",
    required: true,
  },
  {
    questionKey: "creation_experience_score",
    prompt: "A criacao pareceu uma experiencia de jogo ou apenas um formulario?",
    format: "SCALE_1_5_FORM_TO_GAME",
    required: true,
  },
  {
    questionKey: "ai_helpfulness_score",
    prompt: "A IA fez perguntas uteis e respeitou suas escolhas?",
    format: "SCALE_1_5_OR_NOT_USED",
    required: true,
  },
  {
    questionKey: "ai_boundary_problem",
    prompt: "Em algum momento a IA sugeriu algo que parecia spoiler, obrigatorio ou fora do setting?",
    format: "BOOLEAN",
    required: true,
  },
  {
    questionKey: "ai_boundary_problem_details",
    prompt: "Se sim, conte brevemente o que aconteceu.",
    format: "OPTIONAL_TEXT",
    required: false,
    conditionalOn: "ai_boundary_problem",
  },
  {
    questionKey: "story_impact_score",
    prompt: "Voce percebeu como suas decisoes poderiam entrar na historia da mesa?",
    format: "SCALE_1_5",
    required: true,
  },
  {
    questionKey: "final_comment",
    prompt: "Deseja deixar alguma dificuldade, erro ou sugestao?",
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
