import fp from "fastify-plugin";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StorageProvider } from "@repo/storage";
import {
  buildStorageConfig,
  STORAGE_RELAY_PREFIX,
} from "@/config/environment.js";

/**
 * Storage relay (reverse-proxy) plugin.
 *
 * When the deployment uses MinIO with the relay enabled
 * (`MINIO_REVERSE_PROXY_ACTIVE=true` + `API_BASE_URL`), presigned URLs are
 * rewritten to a public relay base and the browser hits
 * `https://<host>/api/storage/<bucket>/<key>?X-Amz-...` instead of the internal
 * MinIO endpoint. This plugin forwards that request to the internal endpoint
 * **verbatim** (same path + query), so MinIO revalidates the original SigV4
 * signature — no re-signing — and streams the response back. MinIO never needs
 * to be exposed publicly.
 *
 * Key mechanics:
 * - Registered in an encapsulated child scope with its own catch-all content
 *   type parser, which shadows the global buffering parser
 *   (`contentTypeNormalizer`) so PUT bodies stream straight from `req.raw`
 *   (no 415, no ~1MB bodyLimit).
 * - The route carries no auth hook (`requireAuth` is per-route, not global); the
 *   SigV4 query signature is the access gate. `allowPublicAccess` is set
 *   explicitly so the route reads as intentionally public and passes the route
 *   security validator.
 * - The upstream endpoint comes from the same `buildStorageConfig()` the storage
 *   plugin uses, so the relay and the presigner can never point at different
 *   hosts.
 */

const ALLOWED_METHODS = new Set(["GET", "HEAD", "PUT"]);

// Request headers forwarded upstream (lowercased). Host is intentionally NOT
// forwarded: fetch derives it from the connection URL (the internal endpoint),
// which equals the host the presigner signed against.
const FORWARD_REQUEST_HEADERS = [
  "content-type",
  "content-length",
  "range",
  "if-none-match",
  "if-modified-since",
] as const;

// Upstream response headers relayed back to the client.
const RELAY_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
  "content-disposition",
  "cache-control",
  "expires",
] as const;

// Upstream connect/headers timeout. The body stream is not bound by this — a
// large transfer keeps flowing once the response headers have arrived.
const UPSTREAM_TIMEOUT_MS = 30_000;

/** Strips the SigV4 signature from a URL before it reaches the logs. */
function redactSignature(url: string): string {
  return url.replace(/X-Amz-Signature=[^&]+/i, "X-Amz-Signature=REDACTED");
}

function makeRelayHandler(upstreamBase: string) {
  return async function relayHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Defense in depth — the route only registers these methods.
    if (!ALLOWED_METHODS.has(request.method)) {
      await reply.status(405).header("allow", "GET, HEAD, PUT").send();
      return;
    }

    // The signature in the query is the access gate; reject unsigned probes
    // before they ever reach MinIO.
    const query = request.query as Record<string, unknown>;
    if (!query["X-Amz-Signature"] || !query["X-Amz-Credential"]) {
      await reply
        .status(403)
        .send({ code: "FORBIDDEN", message: "Missing presigned signature" });
      return;
    }

    const rest = (request.params as Record<string, string>)["*"] ?? "";
    // S3 keys never legitimately contain ".." — reject to avoid surprising
    // path normalization against the upstream.
    if (rest.split("/").some((segment) => segment === "..")) {
      await reply
        .status(400)
        .send({ code: "BAD_REQUEST", message: "Invalid path" });
      return;
    }

    // Take the querystring verbatim from the raw URL so the X-Amz-* params are
    // forwarded byte-for-byte. Re-serializing `request.query` would re-encode
    // them and invalidate the signature.
    const rawUrl = request.raw.url ?? "";
    const queryIndex = rawUrl.indexOf("?");
    const queryString = queryIndex >= 0 ? rawUrl.slice(queryIndex) : "";
    const target = `${upstreamBase}/${rest}${queryString}`;

    const headers = new Headers();
    for (const name of FORWARD_REQUEST_HEADERS) {
      const value = request.headers[name];
      if (typeof value === "string") headers.set(name, value);
    }

    const hasBody = request.method === "PUT";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    // `duplex` is part of the undici RequestInit but not every lib's DOM types.
    const init: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers,
      // Never follow a redirect to a different host.
      redirect: "manual",
      signal: controller.signal,
    };
    if (hasBody) {
      // Stream the request body straight to the upstream. Use `request.body`
      // (the unconsumed stream handed over by the passthrough content-type
      // parser) rather than `request.raw`, which the framework may have already
      // consumed. `duplex: "half"` is mandatory when streaming a request body.
      init.body = request.body as BodyInit;
      init.duplex = "half";
    }

    let upstream: Response;
    try {
      upstream = await fetch(target, init);
    } catch (err) {
      clearTimeout(timeout);
      const aborted = err instanceof Error && err.name === "AbortError";
      request.log.warn(
        { err, target: redactSignature(target) },
        "storage-relay: upstream request failed"
      );
      await reply.status(aborted ? 504 : 502).send({
        code: aborted ? "GATEWAY_TIMEOUT" : "BAD_GATEWAY",
        message: aborted
          ? "Storage upstream timed out"
          : "Storage upstream unavailable",
      });
      return;
    }
    clearTimeout(timeout);

    // Pass the status through unchanged (200/206/304/403/404 all flow back).
    reply.status(upstream.status);
    for (const name of RELAY_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value != null) reply.header(name, value);
    }
    reply.header("x-content-type-options", "nosniff");

    if (request.method === "HEAD" || upstream.body == null) {
      await reply.send();
      return;
    }

    // `upstream.body` is a DOM/undici ReadableStream; cast to the node:stream/web
    // type that `Readable.fromWeb` expects (the two declarations differ only in
    // generic variance).
    await reply.send(
      Readable.fromWeb(upstream.body as unknown as WebReadableStream)
    );
  };
}

const storageRelayPlugin = fp(
  async (fastify) => {
    const config = buildStorageConfig();
    // The relay is enabled only when MINIO_REVERSE_PROXY_ACTIVE=true, which is
    // exactly when buildStorageConfig() injects a MinIO publicBaseUrl. Gating on
    // it means the route exists iff the feature is on — no dangling public
    // endpoint when the relay is off — and never on Azure.
    if (
      config.provider !== StorageProvider.MINIO ||
      !config.minio.publicBaseUrl
    ) {
      fastify.log.info(
        "storage-relay: disabled (MINIO_REVERSE_PROXY_ACTIVE not set, or provider is not MinIO)"
      );
      return;
    }
    const upstreamBase = config.minio.endpoint.replace(/\/+$/, "");

    await fastify.register(
      (relay, _opts, done) => {
        // Shadow the global buffering "*" parser for this scope only, leaving
        // the request body as an untouched stream. Verified on fastify@5:
        // re-adding "*" in a child scope does not throw
        // FST_ERR_CTP_ALREADY_PRESENT.
        relay.addContentTypeParser("*", (_request, payload, parserDone) =>
          parserDone(null, payload)
        );

        relay.route({
          method: ["GET", "HEAD", "PUT"],
          url: "/*",
          // Keep it out of the OpenAPI doc and the Zod response serializer.
          schema: { hide: true },
          // Intentionally public — the SigV4 query is the gate.
          config: { allowPublicAccess: true },
          handler: makeRelayHandler(upstreamBase),
        });

        done();
      },
      { prefix: STORAGE_RELAY_PREFIX }
    );

    fastify.log.info(
      { upstream: upstreamBase },
      "storage-relay: registered at /api/storage/*"
    );
  },
  { name: "storage-relay-plugin", dependencies: ["storage-plugin"] }
);

export default storageRelayPlugin;
