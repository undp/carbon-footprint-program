import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/**
 * Plugin to allow all content types.
 *
 * This plugin adds a catch-all content type parser that accepts any content type
 * and returns null as the parsed body. This is useful for handling requests with
 * unexpected or missing Content-Type headers, such as DELETE requests from
 * certain proxies/gateways (like Azure) that may send an empty string
 * Content-Type header (''), which would otherwise cause Fastify to throw a 415 error.
 */
const contentTypeNormalizer = (
  fastify: FastifyInstance,
  _opts: unknown,
  done: () => void
) => {
  fastify.addContentTypeParser(
    "*",
    { parseAs: "buffer" },
    (_req, _body, done) => {
      done(null, null);
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
