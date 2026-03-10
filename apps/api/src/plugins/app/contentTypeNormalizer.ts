import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/**
 * Plugin to normalize empty Content-Type headers.
 *
 * Some proxies/gateways (like Azure) may send DELETE requests with an empty
 * string Content-Type header (''), which causes Fastify to throw a 415 error.
 * This plugin removes the Content-Type header when it's empty, allowing Fastify
 * to handle the request normally.
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
