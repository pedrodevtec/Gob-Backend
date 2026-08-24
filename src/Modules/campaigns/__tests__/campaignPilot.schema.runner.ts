import assert from "node:assert/strict";
import { Request } from "express";
import { validateSubmitFinalSurvey } from "../campaignPilot.schema";

const validSurvey = {
  characterUnderstandingScore: 5,
  creationExperienceScore: 4,
  aiHelpfulnessScore: "NOT_USED",
  aiBoundaryProblem: false,
  storyImpactScore: 5,
};

const emptyOptionalFields = {
  body: {
    ...validSurvey,
    aiBoundaryProblemDetails: "",
    finalComment: "   ",
  },
} as Request;

validateSubmitFinalSurvey(emptyOptionalFields);
assert.equal(emptyOptionalFields.body.aiBoundaryProblem, false);
assert.equal(emptyOptionalFields.body.aiBoundaryProblemDetails, undefined);
assert.equal(emptyOptionalFields.body.finalComment, undefined);

const uncheckedWithStaleDetails = {
  body: {
    ...validSurvey,
    aiBoundaryProblemDetails: "Este texto não deve ser persistido.",
  },
} as Request;

validateSubmitFinalSurvey(uncheckedWithStaleDetails);
assert.equal(uncheckedWithStaleDetails.body.aiBoundaryProblemDetails, undefined);

const checkedWithDetails = {
  body: {
    ...validSurvey,
    aiBoundaryProblem: true,
    aiBoundaryProblemDetails: "  A sugestão ignorou minha escolha.  ",
    finalComment: "  Gostaria de exemplos mais curtos.  ",
  },
} as Request;

validateSubmitFinalSurvey(checkedWithDetails);
assert.equal(checkedWithDetails.body.aiBoundaryProblem, true);
assert.equal(
  checkedWithDetails.body.aiBoundaryProblemDetails,
  "A sugestão ignorou minha escolha."
);
assert.equal(checkedWithDetails.body.finalComment, "Gostaria de exemplos mais curtos.");

console.log("Campaign final survey validation tests completed.");
