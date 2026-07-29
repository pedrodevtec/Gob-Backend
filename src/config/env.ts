import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const requireEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const optionalProductionEnv = (name: string): string => {
  const value = process.env[name] ?? "";
  if ((process.env.NODE_ENV ?? "development") === "production" && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parsePort(process.env.PORT, 5000),
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
  AI_API_KEY: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "",
  AI_MODEL: process.env.AI_MODEL ?? "gpt-5-nano",
  RESEND_API_KEY: optionalProductionEnv("RESEND_API_KEY"),
  EMAIL_FROM: optionalProductionEnv("EMAIL_FROM"),
  APP_WEB_URL: optionalProductionEnv("APP_WEB_URL") || "http://localhost:3000",
  EMAIL_VERIFICATION_TTL_MINUTES: parsePositiveInt(
    process.env.EMAIL_VERIFICATION_TTL_MINUTES,
    60
  ),
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: parsePositiveInt(
    process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    60
  ),
  PERMISSION_DEBUG: parseBoolean(
    process.env.PERMISSION_DEBUG,
    (process.env.NODE_ENV ?? "development") !== "production"
  ),
};
