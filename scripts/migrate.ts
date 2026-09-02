import { migrate } from "drizzle-orm/neon-http/migrator";

import { createProductionDatabase } from "../src/db/client";

const database = createProductionDatabase();

await migrate(database, { migrationsFolder: "drizzle" });
console.log("AstraOps database migrations applied successfully.");
