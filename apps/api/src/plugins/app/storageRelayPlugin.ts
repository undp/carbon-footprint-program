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
 * (`MINIO_REVERSE_PROXY_ACTIVE=true` + `API_ORIGIN`), presigned URLs are
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

// Overall upstream timeout, covering connect + the full request/response
// exchange.
//
// For GET/HEAD it effectively bounds only connect + time-to-first-byte: once
// `fetch` resolves (response headers in) the timer is cleared and the body
// streams back unbounded. For PUT it bounds the ENTIRE upload, because `fetch`
// does not resolve until MinIO has received the whole body and replied — so it
// must be generous enough for the largest expected upload over the slowest
// expected link (e.g. an on-prem VPN); promote it to an env var if a deployment
// needs to tune it.
//
// TODO: a true idle timeout (abort only when no bytes move for N seconds) plus
// aborting on a genuine client disconnect would be tighter, but `fetch` exposes
// no upload progress and `request.raw`'s `close` fires on normal request-body
// end too (not only on disconnect) — doing it safely needs undici's
// `bodyTimeout`/`headersTimeout` and a response-socket (`reply.raw`) close
// guard. Deferred until there's evidence we need it.
const UPSTREAM_TIMEOUT_MS = 300_000;

/** Strips the SigV4 signature from a URL before it reaches the logs. */
function redactSignature(url: string): string {
  return url.replace(/X-Amz-Signature=[^&]+/i, "X-Amz-Signature=REDACTED");
}

/**
 * True when any path segment decodes to "." or ".." — including the
 * percent-encoded forms the WHATWG URL parser (and so `fetch`) collapses:
 * "%2e", "%2E", ".%2e", "%2e.". Decoding is per-segment and fault-tolerant: a
 * malformed `%`-escape can't be a dot-segment (and `fetch` leaves it intact),
 * so it is allowed through — the signature still gates it. Double-encoded forms
 * ("%252e") decode to "%2e", not ".", and `fetch` does NOT normalize them, so
 * they are correctly treated as a normal key, never as traversal.
 */
function hasDotSegment(path: string): boolean {
  return path.split("/").some((segment) => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return false;
    }
    return decoded === "." || decoded === "..";
  });
}

/**
 * Carves the upstream path + query out of the raw relay URL, keeping BOTH
 * byte-for-byte so the SigV4 signature — computed over the URI-encoded path AND
 * the query — survives the hop. `request.params["*"]` is deliberately NOT used:
 * the router decodes it (e.g. "%2B" → "+", "%20" → " "), and `fetch` would then
 * re-encode it differently than MinIO signed, so the signature would no longer
 * match. The query is carved the same way, for the same reason.
 *
 *   raw:   /api/storage/files/foo%2Bbar.txt?X-Amz-Signature=...
 *   →      { path: "/files/foo%2Bbar.txt", query: "?X-Amz-Signature=..." }
 *
 * Returns `null` when the path is unsafe — the mount prefix doesn't match, or a
 * segment is a dot-segment `fetch` would collapse (see hasDotSegment) — so the
 * caller can reject it before it ever reaches the upstream.
 */
export function resolveRelayTarget(
  rawUrl: string,
  mountPrefix: string
): { path: string; query: string } | null {
  if (!rawUrl.startsWith(mountPrefix)) return null;

  const queryIndex = rawUrl.indexOf("?");
  const query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : "";
  const rawPath = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
  // "/<bucket>/<key>" exactly as signed — leading slash kept, so the caller
  // joins it onto `upstreamBase` with no extra separator.
  const path = rawPath.slice(mountPrefix.length);

  if (hasDotSegment(path)) return null;
  return { path, query };
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

    // Carve the path + query to forward, both byte-for-byte, and reject
    // dot-segment traversal. Taken from the RAW url (not `request.params["*"]`,
    // which the router decodes) so the signed path + query reach MinIO exactly
    // as signed — see resolveRelayTarget.
    const relayTarget = resolveRelayTarget(
      request.raw.url ?? "",
      STORAGE_RELAY_PREFIX
    );
    if (relayTarget === null) {
      await reply
        .status(400)
        .send({ code: "BAD_REQUEST", message: "Invalid path" });
      return;
    }
    const target = `${upstreamBase}${relayTarget.path}${relayTarget.query}`;

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
      // A signal abort is our own timeout; any other rejection is a genuine
      // connect/transport failure.
      const timedOut = controller.signal.aborted;
      request.log.warn(
        { err, target: redactSignature(target) },
        "storage-relay: upstream request failed"
      );
      await reply.status(timedOut ? 504 : 502).send({
        code: timedOut ? "GATEWAY_TIMEOUT" : "BAD_GATEWAY",
        message: timedOut
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
