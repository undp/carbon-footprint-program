import fp from "fastify-plugin";
import fastifyMultipart from "@fastify/multipart";
import { FastifyMultipartOptions } from "@fastify/multipart";

export const autoConfig: FastifyMultipartOptions = {
  limits: {
    fieldNameSize: 200, // Max field name size in bytes
    fieldSize: 1024 * 10, // Max size of a field value (~10KB)
    fields: 20, // Max number of non-file fields
    fileSize: 20 * 1024 * 1024, // Max size per file (20MB)
    files: 5, // Max number of file fields
    headerPairs: 2000, // Keep as default, safe for normal requests
  },
};

export default fp<FastifyMultipartOptions>(
  async (fastify, opts) => {
    await fastify.register(fastifyMultipart, opts);
  },
  { name: "multipart-plugin" }
);
