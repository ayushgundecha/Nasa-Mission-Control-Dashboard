import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getServerEnvironment } from "@/lib/env";

import { schema } from "./schema";

export function createProductionDatabase() {
  const environment = getServerEnvironment();
  if (environment.ASTRAOPS_DATA_MODE !== "live" || !environment.DATABASE_URL) {
    throw new Error(
      "A production database was requested outside live mode. Set ASTRAOPS_DATA_MODE=live and DATABASE_URL; fixture mode must not access Neon.",
    );
  }

  const client = neon(environment.DATABASE_URL);
  return drizzle({ client, schema });
}

export type ProductionDatabase = ReturnType<typeof createProductionDatabase>;
