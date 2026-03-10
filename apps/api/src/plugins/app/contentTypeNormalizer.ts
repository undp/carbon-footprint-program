import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/**
 * Plugin to handle requests with unexpected or missing Content-Type headers.
 *
 * This plugin adds a catch-all content type parser ("*") to handle cases where
 * Fastify would otherwise throw a 415 error.
 *
 * Current behavior:
 * - For DELETE requests: It allows the request and returns null as the parsed body.
 *   This is specifically needed for certain proxies/gateways (like Azure) that
 *   may send DELETE requests with an empty string Content-Type header ('').
 * - For other methods: It throws an error indicating that a valid content type
 *   parser is missing, prompting a review of how to handle that specific request.
 */
const contentTypeNormalizer = (
  fastify: FastifyInstance,
  _opts: unknown,
  done: () => void
) => {
  fastify.addContentTypeParser(
    "*",
    { parseAs: "buffer" },
    (request, _body, done) => {
      if (request.method === "DELETE") {
        // DELETE requests are allowed to have an empty Content-Type header and no body
        return done(null, null);
      }
      done(
        new Error(
          "Content-Type does not have a valid content type parser, review contentTypeNormalizer plugin and decide what to do with this request"
        ),
        null
      );
    }
  );

  fastify.addHook("onRequest", async (request, _reply) => {
    fastify.log.info({
      msg: "contentTypeNormalizer",
      contentType: request.headers["content-type"],
      transferEncoding: request.headers["transfer-encoding"],
    });
  });

  done();
};

export default fp(contentTypeNormalizer, {
  name: "contentTypeNormalizer",
});
