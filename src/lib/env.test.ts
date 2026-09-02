import { afterEach, describe, expect, it, vi } from "vitest";

import { getServerEnvironment, resetEnvironmentForTests } from "./env";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.unstubAllEnvs();
  resetEnvironmentForTests();
});

describe("server environment", () => {
  it("starts in deterministic fixture mode without credentials", () => {
    delete process.env.ASTRAOPS_DATA_MODE;
    delete process.env.DATABASE_URL;
    vi.stubEnv("NODE_ENV", "test");

    expect(getServerEnvironment().ASTRAOPS_DATA_MODE).toBe("fixture");
  });

  it("explains the missing live database credential", () => {
    process.env.ASTRAOPS_DATA_MODE = "live";
    delete process.env.DATABASE_URL;
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getServerEnvironment()).toThrow(/DATABASE_URL is required/);
  });
});
