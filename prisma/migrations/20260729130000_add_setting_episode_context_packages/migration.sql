CREATE TYPE "ContextLayer" AS ENUM ('SETTING', 'EPISODE', 'PLAYTEST_VALIDATION');
CREATE TYPE "ContextClassification" AS ENUM ('OFFICIAL_CANON', 'PUBLIC_CANON', 'SECRET_CANON', 'TABLE_CANON', 'PRODUCT_DECISION', 'RULE', 'HYPOTHESIS', 'PENDING_DECISION', 'OUT_OF_MVP');
CREATE TYPE "ContextVisibility" AS ENUM ('PUBLIC', 'SPECTATOR', 'AUTHENTICATED_TABLE_PLAYER', 'SPECIFIC_CHARACTER', 'TABLE_MASTER', 'AUTHOR_ADMIN');
CREATE TYPE "ContextVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContextVersion" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "episodeId" TEXT,
    "layer" "ContextLayer" NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ContextVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "origin" TEXT NOT NULL,
    "approvalNote" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "approvedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContextUnit" (
    "id" TEXT NOT NULL,
    "contextVersionId" TEXT NOT NULL,
    "classification" "ContextClassification" NOT NULL,
    "visibility" "ContextVisibility" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Setting_stableKey_key" ON "Setting"("stableKey");
CREATE INDEX "Setting_createdAt_idx" ON "Setting"("createdAt");
CREATE UNIQUE INDEX "Episode_settingId_stableKey_key" ON "Episode"("settingId", "stableKey");
CREATE INDEX "Episode_settingId_createdAt_idx" ON "Episode"("settingId", "createdAt");
CREATE UNIQUE INDEX "ContextVersion_settingId_episodeId_layer_version_key" ON "ContextVersion"("settingId", "episodeId", "layer", "version");
CREATE INDEX "ContextVersion_settingId_episodeId_layer_status_version_idx" ON "ContextVersion"("settingId", "episodeId", "layer", "status", "version");
CREATE INDEX "ContextUnit_contextVersionId_visibility_classification_idx" ON "ContextUnit"("contextVersionId", "visibility", "classification");

ALTER TABLE "Setting" ADD CONSTRAINT "Setting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "Setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContextVersion" ADD CONSTRAINT "ContextVersion_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "Setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContextVersion" ADD CONSTRAINT "ContextVersion_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContextVersion" ADD CONSTRAINT "ContextVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContextVersion" ADD CONSTRAINT "ContextVersion_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContextVersion" ADD CONSTRAINT "ContextVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContextUnit" ADD CONSTRAINT "ContextUnit_contextVersionId_fkey" FOREIGN KEY ("contextVersionId") REFERENCES "ContextVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextUnit" ADD CONSTRAINT "ContextUnit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContextUnit" ADD CONSTRAINT "ContextUnit_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
