import { Request } from "express";
import { getBody, optionalString } from "../../utils/validation";
import { UseItemInput } from "./inventory.types";

export const validateUseItem = (req: Request): void => {
  const body = getBody(req);
  const parsed: UseItemInput = {
    note: optionalString(body.note, "note", 1, 255),
  };

  req.body = parsed;
};
