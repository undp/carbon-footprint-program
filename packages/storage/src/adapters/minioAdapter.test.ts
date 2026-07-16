import { afterEach, describe, expect, it, vi } from "vitest";
import type { S3ClientConfig } from "@aws-sdk/client-s3";
import type { MinioStorageConfig } from "../config.js";

// Capture every S3ClientConfig `createMinioAdapter` passes to `new S3Client()`.
// `vi.hoisted` runs before the mock factory (which is itself hoisted above the
// imports), so the array exists when the mock is registered.
const { capturedConfigs } = vi.hoisted(() => ({
  capturedConfigs: [] as S3ClientConfig[],
}));

// Swap only `S3Client` for a constructor that records its input; everything
// else (command classes, error types) stays real so the module loads normally.
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: class {
      constructor(config: S3ClientConfig) {
        capturedConfigs.push(config);
      }
    },
  };
});

// Imported after the mock is registered so it constructs the mocked S3Client.
const { createMinioAdapter } = await import("./minioAdapter.js");

const baseConfig: MinioStorageConfig = {
  endpoint: "http://minio:9000",
  bucket: "files",
  region: "us-east-1",
  forcePathStyle: false,
};

describe("createMinioAdapter — credential wiring", () => {
  afterEach(() => {
    capturedConfigs.length = 0;
  });

  it("omits the `credentials` key entirely when both keys are absent (keyless)", () => {
    createMinioAdapter(baseConfig);

    expect(capturedConfigs).toHaveLength(1);
    const s3Config = capturedConfigs[0];
    // Endpoint/region still wired through; only credentials are left to the
    // SDK's default provider chain.
    expect(s3Config.endpoint).toBe("http://minio:9000");
    expect(s3Config.region).toBe("us-east-1");
    // The key must be ABSENT, not present-and-undefined: passing
    // `credentials: undefined` would disable the default chain.
    expect("credentials" in s3Config).toBe(false);
  });

  it("passes explicit credentials when both keys are present", () => {
    createMinioAdapter({ ...baseConfig, accessKey: "ak", secretKey: "sk" });

    const s3Config = capturedConfigs[0];
    expect(s3Config.credentials).toEqual({
      accessKeyId: "ak",
      secretAccessKey: "sk",
    });
  });
});
