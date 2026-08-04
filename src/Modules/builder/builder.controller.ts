import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString } from "../../utils/validation";
import { BuilderService } from "./builder.service";

const assertSafeConfig = (value: unknown): void => {
  const serialized = JSON.stringify(value);
  const forbiddenMarkers = ["gm_secret", "SECRET_CANON", "TABLE_MASTER", "AUTHOR_ADMIN"];

  for (const marker of forbiddenMarkers) {
    if (serialized.includes(marker)) {
      throw new AppError(
        500,
        "Configuracao do Builder bloqueada por conter dado protegido.",
        "BUILDER_CONFIG_SECRET_LEAK_BLOCKED"
      );
    }
  }
};

export const getActiveBuilderConfig = asyncHandler(async (_req: Request, res: Response) => {
  const builderConfig = BuilderService.getActiveConfig();
  assertSafeConfig(builderConfig);
  sendSuccess(res, 200, { builderConfig });
});

export const getBuilderConfigByVersion = asyncHandler(async (req: Request, res: Response) => {
  const version = requireString(req.params.version, "version", 3, 80);
  const builderConfig = BuilderService.getConfig(version);
  assertSafeConfig(builderConfig);
  sendSuccess(res, 200, { builderConfig });
});
