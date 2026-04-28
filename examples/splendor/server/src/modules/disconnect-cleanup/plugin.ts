import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { createModuleLogger } from "../../lib/logger";
import type { DisconnectCleanupService } from "./model";

const logger = createModuleLogger("disconnect-cleanup");

export function createDisconnectCleanupCron({
  cleanupService,
  pattern,
}: {
  cleanupService: DisconnectCleanupService;
  pattern: string;
}) {
  return new Elysia({ name: "disconnect-cleanup-cron" }).use(
    cron({
      name: "disconnectCleanup",
      pattern,
      async run() {
        try {
          await cleanupService.runOnce();
        } catch (error) {
          logger.error(
            error instanceof Error ? { err: error } : { error },
            "disconnect cleanup failed",
          );
        }
      },
    }),
  );
}
