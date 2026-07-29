import { Router } from "express";
import auth from "../../middleware/auth";
import { createRateLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  confirmEmail,
  login,
  me,
  register,
  resendEmailVerification,
} from "./auth.controller";
import {
  validateConfirmEmail,
  validateLogin,
  validateRegister,
  validateResendEmailVerification,
} from "./auth.schema";

const router = Router();
const authLimiter = createRateLimiter(10, 60_000);
const emailVerificationResendLimiter = createRateLimiter(5, 60_000, {
  scope: "email-verification-resend",
});

router.post("/register", authLimiter, validate(validateRegister), register);
router.post("/login", authLimiter, validate(validateLogin), login);
router.post(
  "/email-verification/confirm",
  authLimiter,
  validate(validateConfirmEmail),
  confirmEmail
);
router.post(
  "/email-verification/resend",
  emailVerificationResendLimiter,
  validate(validateResendEmailVerification),
  resendEmailVerification
);
router.get("/me", auth, me);

export default router;
