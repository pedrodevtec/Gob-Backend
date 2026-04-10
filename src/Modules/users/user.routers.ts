import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { getProfile, updateProfile } from "./user.controller";
import { validateUpdateProfile } from "./user.schema";

const router = Router();

router.get("/me/profile", auth, getProfile);
router.patch("/me/profile", auth, validate(validateUpdateProfile), updateProfile);

export default router;
