import type { LiveConnectionRegistry } from "../websocket";

export interface Stoppable {
  stop(): void;
}

export interface ShutdownService {
  handleSigterm(): void;
}

export interface CreateShutdownServiceDeps {
  registry: LiveConnectionRegistry;
  heartbeat: Stoppable;
  cleanupCron?: Stoppable;
  reconnectAfterMs: number;
  closeCode: number;
}
