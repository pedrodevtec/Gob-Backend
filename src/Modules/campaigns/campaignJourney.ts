import { CharacterSheetStatus } from "@prisma/client";

export interface CampaignJourneyResult {
  state: string;
  route: string;
  actionKey: string;
  title: string;
  description: string;
  ctaLabel: string;
}

export function resolveCampaignJourney(
  slug: string,
  character: { sheetStatus: CharacterSheetStatus } | null,
  hasFinalSurvey: boolean
): CampaignJourneyResult {
  const route = (suffix: string) => `/campanhas/${slug}${suffix}`;
  if (!character) return { state: "CONTEXT_REQUIRED", route: route("/episodio-1"), actionKey: "VIEW_CONTEXT", title: "Conhecer o ponto de partida", description: "Veja o contexto público antes de criar seu personagem.", ctaLabel: "Conhecer contexto" };
  if (character.sheetStatus === CharacterSheetStatus.DRAFT) return { state: "CHARACTER_DRAFT", route: route("/personagem"), actionKey: "EDIT_CHARACTER", title: "Continuar personagem", description: "Seu rascunho está salvo e pode ser retomado.", ctaLabel: "Continuar criação" };
  if (character.sheetStatus === CharacterSheetStatus.CHANGES_REQUESTED) return { state: hasFinalSurvey ? "COMPLETED_CHANGES_REQUIRED" : "CHANGES_REQUIRED", route: route("/personagem"), actionKey: "UPDATE_CHARACTER", title: "Ajustar personagem", description: "O Mestre enviou um pedido de ajuste para a ficha.", ctaLabel: "Ver ajustes" };
  if (!hasFinalSurvey) return { state: "SURVEY_REQUIRED", route: route("/pesquisa"), actionKey: "ANSWER_SURVEY", title: "Responder pesquisa", description: "Sua ficha foi enviada. Conte como foi a experiência de criação.", ctaLabel: "Responder pesquisa" };
  if (character.sheetStatus === CharacterSheetStatus.APPROVED) return { state: "COMPLETED_APPROVED", route: route("/conclusao"), actionKey: "VIEW_COMPLETION", title: "Ver conclusão", description: "Pesquisa concluída e personagem aprovado.", ctaLabel: "Ver conclusão" };
  return { state: "COMPLETED_PENDING_REVIEW", route: route("/conclusao"), actionKey: "VIEW_COMPLETION", title: "Ver conclusão", description: "Sua participação foi concluída. A revisão do Mestre segue em paralelo.", ctaLabel: "Ver conclusão" };
}
