import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { StorageProvider } from "@repo/storage";
import type { FastifyInstance } from "fastify";

/**
 * The relay (and the presigned-URL rewrite that feeds it) is MinIO-only — on
 * the Azure leg the plugin does not register the route at all, so skip there.
 */
const isMinioLeg = process.env.STORAGE_PROVIDER === StorageProvider.MINIO;

// Host is irrelevant under app.inject (only path + query route the request);
// the path prefix must match the plugin's `/api/storage` mount.
const RELAY_ORIGIN = "http://relay.test";
const RELAY_BASE = `${RELAY_ORIGIN}/api/storage`;

/** Reduces an absolute URL to the path + query that app.inject routes on. */
function toInjectablePath(absoluteUrl: string): string {
  const url = new URL(absoluteUrl);
  return `${url.pathname}${url.search}`;
}

describe.skipIf(!isMinioLeg)("storage-relay plugin (/api/storage/*)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Enable the relay through the real config path: buildStorageConfig() reads
    // these at boot, so the route registers and presigned URLs are rewritten to
    // API_BASE_URL + /api/storage (= RELAY_BASE, mirrored on the test adapter).
    process.env.MINIO_REVERSE_PROXY_ACTIVE = "true";
    process.env.API_BASE_URL = RELAY_ORIGIN;
    app = await createTestApp(inject("databaseUrl"), {
      storageDescriptor: inject("storageDescriptor"),
      storagePublicBaseUrl: RELAY_BASE,
    });
  });

  afterAll(async () => {
    await app.close();
    delete process.env.MINIO_REVERSE_PROXY_ACTIVE;
    delete process.env.API_BASE_URL;
  });

  it("rewrites presigned URLs to the relay base", async () => {
    const { url } = await app.storage.generateWriteUrl("relay-test/probe.txt");
    expect(url.startsWith(`${RELAY_BASE}/`)).toBe(true);
    // Path-style keeps the bucket in the path; the signature rides in the query.
    expect(url).toContain("relay-test/probe.txt");
    expect(url).toContain("X-Amz-Signature=");
  });

  it("relays a PUT upload and a GET download round-trip", async () => {
    const key = "relay-test/hello.txt";
    const body = "hello relay world";

    const write = await app.storage.generateWriteUrl(key);
    const putResponse = await app.inject({
      method: "PUT",
      url: toInjectablePath(write.url),
      payload: body,
      headers: { "content-type": "text/plain" },
    });
    expect(putResponse.statusCode).toBe(200);

    const read = await app.storage.generateReadUrl(key);
    const getResponse = await app.inject({
      method: "GET",
      url: toInjectablePath(read.url),
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body).toBe(body);
  });

  it("passes Range requests through (206 + partial body)", async () => {
    const key = "relay-test/range.txt";
    const body = "hello relay world";

    const write = await app.storage.generateWriteUrl(key);
    await app.inject({
      method: "PUT",
      url: toInjectablePath(write.url),
      payload: body,
      headers: { "content-type": "text/plain" },
    });

    const read = await app.storage.generateReadUrl(key);
    const ranged = await app.inject({
      method: "GET",
      url: toInjectablePath(read.url),
      headers: { range: "bytes=0-4" },
    });

    expect(ranged.statusCode).toBe(206);
    expect(ranged.body).toBe("hello");
    expect(ranged.headers["content-range"]).toBeTruthy();
  });

  it("returns 403 when the signature query params are missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/storage/test-files/relay-test/unsigned.txt?foo=bar",
    });
    expect(response.statusCode).toBe(403);
    expect((JSON.parse(response.body) as { code: string }).code).toBe(
      "FORBIDDEN"
    );
  });

  it("passes an upstream 403 through when the signature is tampered", async () => {
    const read = await app.storage.generateReadUrl("relay-test/hello.txt");
    const url = new URL(read.url);
    const signature = url.searchParams.get("X-Amz-Signature") ?? "";
    url.searchParams.set(
      "X-Amz-Signature",
      signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0")
    );

    const response = await app.inject({
      method: "GET",
      url: `${url.pathname}${url.search}`,
    });
    expect(response.statusCode).toBe(403);
  });

  it("passes an upstream 404 through for a missing object", async () => {
    const read = await app.storage.generateReadUrl(
      "relay-test/does-not-exist.txt"
    );
    const response = await app.inject({
      method: "GET",
      url: toInjectablePath(read.url),
    });
    expect(response.statusCode).toBe(404);
  });
});
