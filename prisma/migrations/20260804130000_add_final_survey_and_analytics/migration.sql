CREATE TABLE "FinalSurveyResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "surveyVersion" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalSurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "campaignId" TEXT,
    "tableId" TEXT,
    "characterId" TEXT,
    "sessionId" TEXT,
    "source" TEXT,
    "metadataVersion" TEXT NOT NULL DEFAULT 'pilot-v1',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinalSurveyResponse_userId_campaignId_key" ON "FinalSurveyResponse"("userId", "campaignId");
CREATE INDEX "FinalSurveyResponse_campaignId_submittedAt_idx" ON "FinalSurveyResponse"("campaignId", "submittedAt");
CREATE INDEX "FinalSurveyResponse_tableId_submittedAt_idx" ON "FinalSurveyResponse"("tableId", "submittedAt");
CREATE INDEX "AnalyticsEvent_eventKey_occurredAt_idx" ON "AnalyticsEvent"("eventKey", "occurredAt");
CREATE INDEX "AnalyticsEvent_campaignId_eventKey_occurredAt_idx" ON "AnalyticsEvent"("campaignId", "eventKey", "occurredAt");
CREATE INDEX "AnalyticsEvent_userId_campaignId_occurredAt_idx" ON "AnalyticsEvent"("userId", "campaignId", "occurredAt");
CREATE INDEX "AnalyticsEvent_tableId_occurredAt_idx" ON "AnalyticsEvent"("tableId", "occurredAt");

ALTER TABLE "FinalSurveyResponse" ADD CONSTRAINT "FinalSurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalSurveyResponse" ADD CONSTRAINT "FinalSurveyResponse_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PublicCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalSurveyResponse" ADD CONSTRAINT "FinalSurveyResponse_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PublicCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
