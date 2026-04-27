import fp from "fastify-plugin";
import cors, { FastifyCorsOptions } from "@fastify/cors";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

export const autoConfig: FastifyCorsOptions = {
  origin: ALLOWED_ORIGIN || true,
  credentials: !!ALLOWED_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
};

export default fp<FastifyCorsOptions>(
  async (fastify, opts) => {
    await fastify.register(cors, opts);
  },
  { name: "cors-plugin" }
);
