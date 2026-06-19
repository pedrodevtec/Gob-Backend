import { NextFunction, Request, Response } from "express";
import { TableService } from "../tables/table.service";
import { requireString, requireUserId } from "../../utils/validation";

export const aiMasterOnly = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const tableId = requireString(req.params.tableId, "tableId");
    await TableService.ensureMaster(userId, tableId);
    next();
  } catch (error) {
    next(error);
  }
};
