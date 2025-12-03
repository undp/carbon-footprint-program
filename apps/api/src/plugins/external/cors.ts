import fp from "fastify-plugin";
import cors, { FastifyCorsOptions } from "@fastify/cors";
import { ALLOWED_ORIGIN } from "@/config/environment.js";

export const autoConfig: FastifyCorsOptions = {
  methods: ["GET", "POST", "PUT", "DELETE"],
  // If ALLOWED_ORIGIN is set, restrict CORS to that origin only
  // Otherwise, allow all origins (development mode)
  origin: ALLOWED_ORIGIN ? [ALLOWED_ORIGIN] : true,
};

export default fp<FastifyCorsOptions>(
  async (fastify, opts) => {
    await fastify.register(cors, opts);
  },
  { name: "cors-plugin" }
);
