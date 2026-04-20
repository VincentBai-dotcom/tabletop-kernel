import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../schema";

export function createDbClient(databaseUrl: string) {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return {
    pool,
    db: drizzle(pool, { schema }),
  };
}

export type DbClient = ReturnType<typeof createDbClient>;
export type Db = DbClient["db"];
