import type { CreateShutdownServiceDeps, ShutdownService } from "./model";

export function createShutdownService({
  registry,
  heartbeat,
  cleanupCron,
  reconnectAfterMs,
  closeCode,
}: CreateShutdownServiceDeps): ShutdownService {
  return {
    handleSigterm() {
      heartbeat.stop();
      cleanupCron?.stop();

      for (const connection of registry.getConnections()) {
        connection.send({
          type: "server_restarting",
          reconnectAfterMs,
        });
        connection.close?.(closeCode, "server_restarting");
      }
    },
  };
}
