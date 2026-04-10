import { NextFunction, Request, Response } from "express";

export type RequestValidator = (req: Request) => void;

export const validate = (validator: RequestValidator) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      validator(req);
      next();
    } catch (error) {
      next(error);
    }
  };
};
