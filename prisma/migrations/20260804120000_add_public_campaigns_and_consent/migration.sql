CREATE TYPE "PublicCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

CREATE TYPE "ParticipantConsentStatus" AS ENUM ('ACCEPTED', 'DECLINED', 'REVOKED');

CREATE TABLE "PublicCampaign" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PublicCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "builderConfigVersion" TEXT NOT NULL DEFAULT 'pilot-v1',
    "consentVersion" TEXT NOT NULL DEFAULT 'research-pilot-v1',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "activatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParticipantConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "status" "ParticipantConsentStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicCampaign_tableId_key" ON "PublicCampaign"("tableId");
CREATE UNIQUE INDEX "PublicCampaign_slug_key" ON "PublicCampaign"("slug");
CREATE INDEX "PublicCampaign_status_createdAt_idx" ON "PublicCampaign"("status", "createdAt");

CREATE UNIQUE INDEX "ParticipantConsent_userId_campaignId_consentVersion_key" ON "ParticipantConsent"("userId", "campaignId", "consentVersion");
CREATE INDEX "ParticipantConsent_campaignId_status_createdAt_idx" ON "ParticipantConsent"("campaignId", "status", "createdAt");
CREATE INDEX "ParticipantConsent_userId_status_createdAt_idx" ON "ParticipantConsent"("userId", "status", "createdAt");

ALTER TABLE "PublicCampaign" ADD CONSTRAINT "PublicCampaign_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicCampaign" ADD CONSTRAINT "PublicCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicCampaign" ADD CONSTRAINT "PublicCampaign_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ParticipantConsent" ADD CONSTRAINT "ParticipantConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantConsent" ADD CONSTRAINT "ParticipantConsent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PublicCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
