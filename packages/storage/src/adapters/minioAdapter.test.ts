import { afterEach, describe, expect, it, vi } from "vitest";
import type { S3ClientConfig } from "@aws-sdk/client-s3";
import type { MinioStorageConfig } from "../config.js";

// Capture every S3ClientConfig `createMinioAdapter` passes to `new S3Client()`,
// and control what the stubbed default credential chain resolves to.
// `vi.hoisted` runs before the mock factory (which is itself hoisted above the
// imports), so both exist when the mock is registered.
const { capturedConfigs, chain } = vi.hoisted(() => ({
  capturedConfigs: [] as S3ClientConfig[],
  // Stands in for the SDK's resolved credential provider on the keyless path.
  // Resolves by default (credentials found); tests override it to reject.
  chain: {
    resolve: (): Promise<{ accessKeyId: string }> =>
      Promise.resolve({ accessKeyId: "from-chain" }),
  },
}));

// Swap only `S3Client` for a constructor that records its input; everything
// else (command classes, error types) stays real so the module loads normally.
// `config.credentials` mirrors the real client, where the SDK normalises static
// keys and the default chain alike into a provider function.
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: class {
      config: { credentials: () => Promise<unknown> };
      constructor(config: S3ClientConfig) {
        capturedConfigs.push(config);
        this.config = { credentials: () => chain.resolve() };
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

const RESOLVES = (): Promise<{ accessKeyId: string }> =>
  Promise.resolve({ accessKeyId: "from-chain" });

describe("createMinioAdapter — credential wiring", () => {
  afterEach(() => {
    capturedConfigs.length = 0;
    chain.resolve = RESOLVES;
  });

  it("omits the `credentials` key entirely when no static credentials are set (keyless)", async () => {
    await createMinioAdapter(baseConfig);

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

  it("passes explicit credentials when static credentials are configured", async () => {
    await createMinioAdapter({
      ...baseConfig,
      credentials: { accessKey: "ak", secretKey: "sk" },
    });

    const s3Config = capturedConfigs[0];
    expect(s3Config.credentials).toEqual({
      accessKeyId: "ak",
      secretAccessKey: "sk",
    });
  });
});

describe("createMinioAdapter — keyless fail-fast", () => {
  afterEach(() => {
    capturedConfigs.length = 0;
    chain.resolve = RESOLVES;
  });

  it("rejects with a message naming both modes when the default chain yields nothing", async () => {
    chain.resolve = () =>
      Promise.reject(
        new Error("Could not load credentials from any providers")
      );

    await expect(createMinioAdapter(baseConfig)).rejects.toThrow(
      /could not resolve any S3 credentials/i
    );
    // The operator needs to know which of the two fixes applies to them.
    await expect(createMinioAdapter(baseConfig)).rejects.toThrow(
      /MINIO_ACCESS_KEY \/ MINIO_SECRET_KEY.*task role/s
    );
  });

  it("preserves the underlying SDK error as `cause`", async () => {
    const sdkError = new Error("Could not load credentials from any providers");
    chain.resolve = () => Promise.reject(sdkError);

    await expect(createMinioAdapter(baseConfig)).rejects.toMatchObject({
      cause: sdkError,
    });
  });

  it("resolves normally when the default chain supplies credentials", async () => {
    await expect(createMinioAdapter(baseConfig)).resolves.toBeDefined();
  });

  it("does not touch the credential chain when static credentials are set", async () => {
    chain.resolve = () => Promise.reject(new Error("chain must not be called"));

    await expect(
      createMinioAdapter({
        ...baseConfig,
        credentials: { accessKey: "ak", secretKey: "sk" },
      })
    ).resolves.toBeDefined();
  });
});
