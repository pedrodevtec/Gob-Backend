import { Router } from "express";
import auth from "../../middleware/auth";
import { createRateLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { login, me, register } from "./auth.controller";
import { validateLogin, validateRegister } from "./auth.schema";

const router = Router();
const authLimiter = createRateLimiter(10, 60_000);

router.post("/register", authLimiter, validate(validateRegister), register);
router.post("/login", authLimiter, validate(validateLogin), login);
router.get("/me", auth, me);

export default router;
