export interface PlayerSessionRecord {
  id: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface PlayerSessionStore {
  findByTokenHash(tokenHash: string): Promise<PlayerSessionRecord | null>;
  insert(input: { tokenHash: string; now: Date }): Promise<PlayerSessionRecord>;
  touch(input: { id: string; now: Date }): Promise<void>;
}

export interface ResolvePlayerSessionInput {
  token?: string | null;
}

export interface ResolvePlayerSessionResult {
  playerSessionId: string;
  token: string;
  tokenWasCreated: boolean;
}
