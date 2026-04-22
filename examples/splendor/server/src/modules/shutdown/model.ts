import type { LiveConnectionRegistry } from "../websocket";

export interface Stoppable {
  stop(): void;
}

export interface ServerStopper {
  stop(): void | Promise<unknown>;
}

export interface ShutdownService {
  handleSigterm(): Promise<void>;
}

export interface CreateShutdownServiceDeps {
  registry: LiveConnectionRegistry;
  heartbeat: Stoppable;
  cleanupCron?: Stoppable;
  server: ServerStopper;
  reconnectAfterMs: number;
  closeCode: number;
}
