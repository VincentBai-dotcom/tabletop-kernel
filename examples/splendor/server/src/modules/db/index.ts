import { loadConfig } from "../config";
import { createDbClient } from "./client";
import * as schema from "../../schema";

const defaultClient = createDbClient(loadConfig().database.url);

export const db = defaultClient.db;
export const pool = defaultClient.pool;
export { createDbClient, schema };
export type { Db, DbClient } from "./client";
