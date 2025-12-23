import fp from "fastify-plugin";
import cors, { FastifyCorsOptions } from "@fastify/cors";

export const autoConfig: FastifyCorsOptions = {
  methods: ["GET", "POST", "PATCH", "DELETE"],
};

export default fp<FastifyCorsOptions>(
  async (fastify, opts) => {
    await fastify.register(cors, opts);
  },
  { name: "cors-plugin" }
);
