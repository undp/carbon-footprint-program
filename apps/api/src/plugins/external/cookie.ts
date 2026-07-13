import fp from "fastify-plugin";
import cookie, { FastifyCookieOptions } from "@fastify/cookie";
import { COOKIE_SECRET } from "@/config/environment.js";

export const autoConfig: FastifyCookieOptions = {
  secret: COOKIE_SECRET,
  parseOptions: { signed: true },
};

export default fp<FastifyCookieOptions>(
  async (fastify, opts) => {
    await fastify.register(cookie, opts);
  },
  { name: "cookie-plugin" }
);
