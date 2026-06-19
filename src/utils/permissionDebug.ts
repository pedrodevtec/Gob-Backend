import { env } from "../config/env";

export const permissionDebug = (
  event: string,
  context: Record<string, unknown>
): void => {
  if (!env.PERMISSION_DEBUG) {
    return;
  }

  console.info(`[permission-debug] ${event}`, context);
};
