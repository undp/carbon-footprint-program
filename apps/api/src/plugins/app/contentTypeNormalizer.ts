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
  fastify.addHook("onRequest", (request, _reply) => {
    const contentType = request.headers["content-type"];

    // If Content-Type is an empty string, remove it
    if (typeof contentType === "string" && contentType.trim() === "") {
      request.log.warn("Content-Type is empty; removing it");
      delete request.headers["content-type"];
    }
  });

  done();
};

export default fp(contentTypeNormalizer, {
  name: "contentTypeNormalizer",
});
