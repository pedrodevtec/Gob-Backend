import { Router } from "express";
import {
  getActiveBuilderConfig,
  getBuilderConfigByVersion,
} from "./builder.controller";

const router = Router();

router.get("/configs/active", getActiveBuilderConfig);
router.get("/configs/:version", getBuilderConfigByVersion);

export default router;
