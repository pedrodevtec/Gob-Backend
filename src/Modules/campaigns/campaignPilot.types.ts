import { Prisma } from "@prisma/client";

export type FinalSurveyAnswerValue = number | "NOT_USED" | boolean | string | null;

export interface SubmitFinalSurveyInput {
  characterUnderstandingScore: number;
  creationExperienceScore: number;
  aiHelpfulnessScore: number | "NOT_USED";
  aiBoundaryProblem: boolean;
  aiBoundaryProblemDetails?: string;
  storyImpactScore: number;
  finalComment?: string;
}

export interface RecordAnalyticsEventInput {
  eventKey: string;
  characterId?: string;
  sessionId?: string;
  source?: string;
  metadata?: Prisma.InputJsonObject;
}
