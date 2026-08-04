import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/** What the fallback parser should do with an unhandled content type. */
export type ContentTypeDecision =
  { accept: true } | { accept: false; error: Error & { statusCode: number } };

/**
 * Decide how the catch-all ("*") content-type parser should treat a request.
 * Pure over its inputs so both outcomes — accept a bodyless DELETE with no
 * Content-Type, or reject everything else with a 415 — are unit-testable
 * without a live request. The plugin below calls this and performs the parser
 * side effects (log + done), so runtime behavior is unchanged.
 *
 * Accepting a bodyless DELETE with undefined Content-Type is specifically
 * needed for certain proxies/gateways (like Azure) that send DELETE requests
 * with no Content-Type header.
 */
export function classifyUnknownContentType(params: {
  method: string;
  contentType: string | undefined;
  url: string;
  bodyLength: number;
}): ContentTypeDecision {
  const { method, contentType, url, bodyLength } = params;

  if (method === "DELETE" && contentType == undefined && bodyLength === 0) {
    return { accept: true };
  }

  const err = new Error(
    `No content type parser registered for '${contentType || "(missing)"}'. ` +
      `Request: ${method} ${url} | Body: ${bodyLength} bytes. ` +
      `Only bodyless DELETE requests with undefined Content-Type are handled by the fallback parser. ` +
      `Fix: (1) Register a Fastify content type parser for '${contentType}', or ` +
      `(2) Verify the client is sending a supported Content-Type header (e.g., application/json).`
  ) as Error & { statusCode: number };
  err.statusCode = 415;
  return { accept: false, error: err };
}

/**
 * Plugin to handle requests with unexpected or missing Content-Type headers.
 *
 * This plugin adds a catch-all content type parser ("*") to handle cases where
 * Fastify would otherwise throw a 415 error. The decision itself lives in
 * {@link classifyUnknownContentType}.
 */
const contentTypeNormalizer = (
  fastify: FastifyInstance,
  _opts: unknown,
  done: () => void
) => {
  fastify.addContentTypeParser(
    "*",
    { parseAs: "buffer" },
    (request, body, done) => {
      const contentType = request.headers["content-type"];
      const decision = classifyUnknownContentType({
        method: request.method,
        contentType,
        url: request.url,
        bodyLength: body.length,
      });

      if (decision.accept) {
        fastify.log.info({
          msg: "contentTypeNormalizer was used",
          contentType,
          transferEncoding: request.headers["transfer-encoding"],
        });
        return done(null, null);
      }

      done(decision.error, null);
    }
  );

  done();
};

export default fp(contentTypeNormalizer, {
  name: "contentTypeNormalizer",
});
