import type { CreateShutdownServiceDeps, ShutdownService } from "./model";

export function createShutdownService({
  registry,
  heartbeat,
  server,
  exitProcess,
  reconnectAfterMs,
  closeCode,
  logger,
}: CreateShutdownServiceDeps): ShutdownService {
  let shutdownStarted = false;

  return {
    async handleSigterm() {
      if (shutdownStarted) {
        return;
      }
      shutdownStarted = true;

      const connectionCount = registry.getConnections().length;
      logger.info({ connectionCount }, "server shutdown started");

      heartbeat.stop();
      logger.info({}, "server shutdown heartbeat stopped");

      for (const connection of registry.getConnections()) {
        connection.send({
          type: "server_restarting",
          reconnectAfterMs,
        });
        connection.close?.(closeCode, "server_restarting");
      }
      logger.info(
        {
          closeCode,
          connectionCount,
          reconnectAfterMs,
        },
        "server shutdown connections closed",
      );

      await server.stop();
      logger.info({}, "server shutdown listener stopped");

      exitProcess(0);
    },
  };
}
