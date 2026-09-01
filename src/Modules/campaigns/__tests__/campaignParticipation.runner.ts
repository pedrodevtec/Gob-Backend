import assert from "node:assert/strict";
import { Request } from "express";
import { AppError } from "../../../errors/AppError";
import { CampaignParticipationPolicy } from "../campaignParticipation.policy";
import { validateRecordConsent } from "../campaign.schema";

const request = {
  body: { status: "accepted", consentVersion: " research-pilot-v2 ", source: " web " },
} as Request;
validateRecordConsent(request);
assert.deepEqual(request.body, {
  status: "ACCEPTED",
  consentVersion: "research-pilot-v2",
  source: "web",
});

const revoked = { body: { status: "REVOKED", consentVersion: "research-pilot-v2" } } as Request;
validateRecordConsent(revoked);
assert.equal(revoked.body.status, "REVOKED");

assert.throws(
  () => validateRecordConsent({ body: { status: "ACCEPTED" } } as Request),
  (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR"
);

const fakeDb = (active: boolean, accepted: boolean) => ({
  character: {
    findUnique: async () => ({
      userId: "user-1",
      tableId: "table-1",
      table: { publicCampaign: { id: "campaign-1", consentVersion: "research-pilot-v2" } },
    }),
  },
  tableMember: { findFirst: async () => (active ? { id: "member-1" } : null) },
  participantConsent: { findUnique: async () => (accepted ? { status: "ACCEPTED" } : { status: "REVOKED" }) },
}) as any;

void (async () => {
  CampaignParticipationPolicy.setDbForTests(fakeDb(true, true));
  await CampaignParticipationPolicy.requirePublicProfileEligibility("character-1");

  CampaignParticipationPolicy.setDbForTests(fakeDb(false, true));
  await assert.rejects(
    CampaignParticipationPolicy.requirePublicProfileEligibility("character-1"),
    (error: unknown) => error instanceof AppError && error.code === "PUBLIC_CHARACTER_NOT_FOUND"
  );

  CampaignParticipationPolicy.setDbForTests(fakeDb(true, false));
  await assert.rejects(
    CampaignParticipationPolicy.requirePublicProfileEligibility("character-1"),
    (error: unknown) => error instanceof AppError && error.code === "PUBLIC_CHARACTER_NOT_FOUND"
  );

  CampaignParticipationPolicy.resetDbForTests();
  console.log("Campaign participation contract tests completed.");
})().catch((error) => {
  CampaignParticipationPolicy.resetDbForTests();
  console.error(error);
  process.exit(1);
});
