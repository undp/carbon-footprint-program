import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/**
 * Plugin to handle requests with unexpected or missing Content-Type headers.
 *
 * This plugin adds a catch-all content type parser ("*") to handle cases where
 * Fastify would otherwise throw a 415 error.
 *
 * Current behavior:
 * - For DELETE requests with undefined Content-Type AND empty body:
 *   Allows the request and returns null as the parsed body. This is specifically
 *   needed for certain proxies/gateways (like Azure) that may send DELETE requests
 *   with an undefined Content-Type header.
 * - For all other cases (including DELETE with non-empty Content-Type or body):
 *   Returns HTTP 415 (Unsupported Media Type) error.
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

      if (
        request.method === "DELETE" &&
        contentType == undefined &&
        body.length === 0
      ) {
        fastify.log.info({
          msg: "contentTypeNormalizer was used",
          contentType: request.headers["content-type"],
          transferEncoding: request.headers["transfer-encoding"],
        });
        return done(null, null);
      }

      const err = new Error(
        `No content type parser registered for '${contentType || "(missing)"}'. ` +
          `Request: ${request.method} ${request.url} | Body: ${body.length} bytes. ` +
          `Only bodyless DELETE requests with undefined Content-Type are handled by the fallback parser. ` +
          `Fix: (1) Register a Fastify content type parser for '${contentType}', or ` +
          `(2) Verify the client is sending a supported Content-Type header (e.g., application/json).`
      ) as Error & { statusCode?: number };
      err.statusCode = 415;
      done(err, null);
    }
  );

  done();
};

export default fp(contentTypeNormalizer, {
  name: "contentTypeNormalizer",
});
