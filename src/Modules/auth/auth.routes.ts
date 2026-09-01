import { NextFunction, Request, Response, Router } from "express";
import auth from "../../middleware/auth";
import { createRateLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  confirmEmail,
  login,
  logout,
  me,
  refresh,
  register,
  resendEmailVerification,
} from "./auth.controller";
import {
  validateConfirmEmail,
  validateLogin,
  validateRefreshToken,
  validateRegister,
  validateResendEmailVerification,
} from "./auth.schema";

const router = Router();
const authLimiter = createRateLimiter(10, 60_000);
const emailVerificationResendLimiter = createRateLimiter(5, 60_000, {
  scope: "email-verification-resend",
});
const noStore = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("Cache-Control", "no-store");
  next();
};

router.post("/register", authLimiter, validate(validateRegister), register);
router.post("/login", noStore, authLimiter, validate(validateLogin), login);
router.post("/refresh", noStore, authLimiter, validate(validateRefreshToken), refresh);
router.post("/logout", noStore, authLimiter, validate(validateRefreshToken), logout);
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
router.get("/me", noStore, auth, me);

export default router;
