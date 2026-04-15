import { Request } from "express";
import { AppError } from "../errors/AppError";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const isPlainObject = isObject;

export const getBody = (req: Request): Record<string, unknown> => {
  if (!isObject(req.body)) {
    throw new AppError(400, "Body da requisicao invalido.", "INVALID_BODY");
  }

  return req.body;
};

export const requireString = (
  value: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 255
): string => {
  if (typeof value !== "string") {
    throw new AppError(400, `Campo ${fieldName} deve ser texto.`, "VALIDATION_ERROR");
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new AppError(
      400,
      `Campo ${fieldName} deve ter entre ${minLength} e ${maxLength} caracteres.`,
      "VALIDATION_ERROR"
    );
  }

  return trimmed;
};

export const optionalString = (
  value: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 255
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return requireString(value, fieldName, minLength, maxLength);
};

export const requireEmail = (value: unknown, fieldName: string): string => {
  const email = requireString(value, fieldName, 5, 255).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new AppError(400, `Campo ${fieldName} deve ser um email valido.`, "VALIDATION_ERROR");
  }

  return email;
};

export const requirePositiveInt = (
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number }
): number => {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new AppError(400, `Campo ${fieldName} deve ser um inteiro.`, "VALIDATION_ERROR");
  }

  const min = options?.min ?? 0;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;

  if (value < min || value > max) {
    throw new AppError(
      400,
      `Campo ${fieldName} deve estar entre ${min} e ${max}.`,
      "VALIDATION_ERROR"
    );
  }

  return value;
};

export const optionalNumber = (
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number }
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(400, `Campo ${fieldName} deve ser numerico.`, "VALIDATION_ERROR");
  }

  const min = options?.min ?? -Number.MAX_SAFE_INTEGER;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;

  if (value < min || value > max) {
    throw new AppError(
      400,
      `Campo ${fieldName} deve estar entre ${min} e ${max}.`,
      "VALIDATION_ERROR"
    );
  }

  return value;
};

export const requireObject = (value: unknown, fieldName: string): Record<string, unknown> => {
  if (!isObject(value)) {
    throw new AppError(400, `Campo ${fieldName} deve ser um objeto.`, "VALIDATION_ERROR");
  }

  return value;
};

export const optionalObject = (
  value: unknown,
  fieldName: string
): Record<string, unknown> | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return requireObject(value, fieldName);
};

export const requireArray = (value: unknown, fieldName: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new AppError(400, `Campo ${fieldName} deve ser uma lista.`, "VALIDATION_ERROR");
  }

  return value;
};

export const optionalArray = (value: unknown, fieldName: string): unknown[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return requireArray(value, fieldName);
};

export const requireUserId = (req: Request): string => {
  if (!req.user?.id) {
    throw new AppError(401, "Usuario nao autenticado.", "AUTH_REQUIRED");
  }

  return req.user.id;
};

export const requireUserRole = (req: Request): "PLAYER" | "ADMIN" => {
  if (!req.user?.role) {
    throw new AppError(401, "Usuario nao autenticado.", "AUTH_REQUIRED");
  }

  return req.user.role;
};
