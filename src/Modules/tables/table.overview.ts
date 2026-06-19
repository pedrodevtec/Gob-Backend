export type MasterOverviewActionKey =
  | "CONFIGURE_WORLD"
  | "INVITE_PLAYERS"
  | "REVIEW_CHARACTERS"
  | "CREATE_FIRST_MISSION"
  | "ADD_TIMELINE_EVENT"
  | "FOLLOW_SUBMISSIONS"
  | "CONTINUE_CAMPAIGN";

export interface MasterOverviewProgress {
  hasWorldSummary: boolean;
  hasPlayers: boolean;
  totalCharacters: number;
  pendingCharacters: number;
  totalMissions: number;
  hasActiveMission: boolean;
  totalEvents: number;
  pendingSubmissions: number;
}

export interface MasterOverviewChecklistItem {
  key: Exclude<
    MasterOverviewActionKey,
    "FOLLOW_SUBMISSIONS" | "CONTINUE_CAMPAIGN"
  >;
  label: string;
  done: boolean;
}

export interface MasterOverviewRecommendedAction {
  key: MasterOverviewActionKey;
  title: string;
  description: string;
  ctaLabel: string;
}

export const buildMasterOverviewGuidance = (
  progress: MasterOverviewProgress
): {
  onboardingChecklist: MasterOverviewChecklistItem[];
  nextRecommendedAction: MasterOverviewRecommendedAction;
} => {
  const onboardingChecklist: MasterOverviewChecklistItem[] = [
    {
      key: "CONFIGURE_WORLD",
      label: "Configure o mundo",
      done: progress.hasWorldSummary,
    },
    {
      key: "INVITE_PLAYERS",
      label: "Convide jogadores",
      done: progress.hasPlayers,
    },
    {
      key: "REVIEW_CHARACTERS",
      label: "Revise personagens",
      done: progress.pendingCharacters === 0,
    },
    {
      key: "CREATE_FIRST_MISSION",
      label: "Crie a primeira missão",
      done: progress.totalMissions > 0,
    },
    {
      key: "ADD_TIMELINE_EVENT",
      label: "Registre o primeiro evento",
      done: progress.totalEvents > 0,
    },
  ];

  if (!progress.hasWorldSummary) {
    return {
      onboardingChecklist,
      nextRecommendedAction: {
        key: "CONFIGURE_WORLD",
        title: "Configure o mundo",
        description:
          "Defina o título e o resumo do mundo para orientar a campanha e os jogadores.",
        ctaLabel: "Configurar mundo",
      },
    };
  }

  if (!progress.hasPlayers) {
    return {
      onboardingChecklist,
      nextRecommendedAction: {
        key: "INVITE_PLAYERS",
        title: "Convide jogadores",
        description:
          "O mundo está configurado. Compartilhe o código da mesa para formar o grupo.",
        ctaLabel: "Ver código de convite",
      },
    };
  }

  if (progress.pendingCharacters > 0) {
    return {
      onboardingChecklist,
      nextRecommendedAction: {
        key: "REVIEW_CHARACTERS",
        title: "Revise os personagens",
        description: `Existem ${progress.pendingCharacters} personagem(ns) aguardando sua revisão.`,
        ctaLabel: "Revisar personagens",
      },
    };
  }

  if (!progress.hasActiveMission) {
    return {
      onboardingChecklist,
      nextRecommendedAction: {
        key: "CREATE_FIRST_MISSION",
        title: "Crie a primeira missão",
        description:
          "Sua mesa já possui mundo configurado. Agora crie uma missão inicial para os jogadores.",
        ctaLabel: "Criar missão",
      },
    };
  }

  if (progress.totalEvents === 0) {
    return {
      onboardingChecklist,
      nextRecommendedAction: {
        key: "ADD_TIMELINE_EVENT",
        title: "Registre o primeiro evento",
        description:
          "Adicione um evento à timeline para registrar o início e os marcos da campanha.",
        ctaLabel: "Adicionar evento",
      },
    };
  }

  if (progress.pendingSubmissions > 0) {
    return {
      onboardingChecklist,
      nextRecommendedAction: {
        key: "FOLLOW_SUBMISSIONS",
        title: "Acompanhe as submissões",
        description: `Existem ${progress.pendingSubmissions} resposta(s) de missão aguardando revisão.`,
        ctaLabel: "Ver submissões",
      },
    };
  }

  return {
    onboardingChecklist,
    nextRecommendedAction: {
      key: "CONTINUE_CAMPAIGN",
      title: "Continue a campanha",
      description:
        "As etapas iniciais estão concluídas. Continue criando missões e registrando a evolução da história.",
      ctaLabel: "Continuar campanha",
    },
  };
};
