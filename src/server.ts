import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import prisma from "./config/db";
import { env } from "./config/env";
import authRoutes from "./Modules/auth/auth.routes";
import adminRoutes from "./Modules/admin/admin.routes";
import characterRoutes from "./Modules/characters/character.routes";
import gameplayRoutes from "./Modules/gameplay/gameplay.routes";
import inventoryRoutes from "./Modules/inventory/inventory.routes";
import rewardsRoutes from "./Modules/rewards/rewards.routes";
import shopRoutes from "./Modules/shop/shop.routes";
import transactionRoutes from "./Modules/transactions/transaction.routes";
import userRoutes from "./Modules/users/user.routers";
import { openApiDocument } from "./docs/openapi";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";
import { requestContext } from "./middleware/requestContext";

const app = express();

const corsOrigin =
  env.CORS_ORIGIN === "*"
    ? true
    : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

app.use(cors({ origin: corsOrigin }));
app.use(requestContext);
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.get("/ready", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, status: "ready" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/meta/version", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    name: "gob-backend",
    version: "1.3.0",
    environment: env.NODE_ENV,
  });
});

app.get("/docs.json", (_req: Request, res: Response) => {
  res.status(200).json(openApiDocument);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/characters", characterRoutes);
app.use("/api/v1/gameplay", gameplayRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/rewards", rewardsRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/shop", shopRoutes);

app.use("/api/users", authRoutes);
app.use("/api/characters", characterRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${env.PORT}`);
});
