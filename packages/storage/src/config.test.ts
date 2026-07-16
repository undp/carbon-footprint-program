import { describe, expect, it } from "vitest";
import { StorageProvider } from "./provider.js";
import { storageConfigFromEnv } from "./config.js";

/**
 * Build a minimal-but-valid MinIO env record. `MINIO_ENDPOINT` is always
 * required; the access/secret keys are layered on per-case so each test states
 * exactly which credentials it provides.
 */
const minioEnv = (
  overrides: Record<string, string | undefined> = {}
): Record<string, string | undefined> => ({
  STORAGE_PROVIDER: StorageProvider.MINIO,
  MINIO_ENDPOINT: "http://minio:9000",
  ...overrides,
});

describe("storageConfigFromEnv — MinIO credentials", () => {
  it("parses keyless (both keys absent) with accessKey/secretKey undefined", () => {
    const config = storageConfigFromEnv(minioEnv());
    expect(config.provider).toBe(StorageProvider.MINIO);
    if (config.provider !== StorageProvider.MINIO)
      throw new Error("unreachable");
    expect(config.minio.endpoint).toBe("http://minio:9000");
    expect(config.minio.accessKey).toBeUndefined();
    expect(config.minio.secretKey).toBeUndefined();
  });

  it("treats empty-string keys (the docker-compose `${VAR:-}` placeholder) as absent", () => {
    const config = storageConfigFromEnv(
      minioEnv({ MINIO_ACCESS_KEY: "", MINIO_SECRET_KEY: "" })
    );
    if (config.provider !== StorageProvider.MINIO)
      throw new Error("unreachable");
    expect(config.minio.accessKey).toBeUndefined();
    expect(config.minio.secretKey).toBeUndefined();
  });

  it("keeps both keys when both are present (unchanged keyed behaviour)", () => {
    const config = storageConfigFromEnv(
      minioEnv({ MINIO_ACCESS_KEY: "ak", MINIO_SECRET_KEY: "sk" })
    );
    if (config.provider !== StorageProvider.MINIO)
      throw new Error("unreachable");
    expect(config.minio.accessKey).toBe("ak");
    expect(config.minio.secretKey).toBe("sk");
  });

  it("throws when only MINIO_ACCESS_KEY is set (half-configured pair)", () => {
    expect(() =>
      storageConfigFromEnv(minioEnv({ MINIO_ACCESS_KEY: "ak" }))
    ).toThrow(/MINIO_ACCESS_KEY and MINIO_SECRET_KEY.*together, or neither/s);
  });

  it("throws when only MINIO_SECRET_KEY is set (half-configured pair)", () => {
    expect(() =>
      storageConfigFromEnv(minioEnv({ MINIO_SECRET_KEY: "sk" }))
    ).toThrow(/MINIO_ACCESS_KEY and MINIO_SECRET_KEY.*together, or neither/s);
  });

  it("still requires MINIO_ENDPOINT", () => {
    expect(() =>
      storageConfigFromEnv({ STORAGE_PROVIDER: StorageProvider.MINIO })
    ).toThrow(/MINIO_ENDPOINT is missing/);
  });

  it("applies bucket/region/forcePathStyle defaults in keyless mode", () => {
    const config = storageConfigFromEnv(minioEnv());
    if (config.provider !== StorageProvider.MINIO)
      throw new Error("unreachable");
    expect(config.minio.bucket).toBe("files");
    expect(config.minio.region).toBe("us-east-1");
    expect(config.minio.forcePathStyle).toBe(true);
  });
});
