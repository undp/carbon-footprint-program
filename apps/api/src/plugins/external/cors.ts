import fp from "fastify-plugin";
import cors, { FastifyCorsOptions } from "@fastify/cors";
import { CHATBOT_CONVERSATION_ID_HEADER } from "@repo/types";
import { ALLOWED_ORIGIN } from "@/config/environment.js";

export const autoConfig: FastifyCorsOptions = {
  // In production ALLOWED_ORIGIN is guaranteed set (parseEnv fails closed at
  // boot otherwise), so the `|| true` wildcard fallback only ever applies in
  // dev/test where reflecting any origin is acceptable.
  origin: ALLOWED_ORIGIN || true,
  credentials: !!ALLOWED_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  // Without this the rate-limit headers reach the browser but not the page:
  // they are not CORS-safelisted, so `response.headers.get("x-ratelimit-reset")`
  // reads null on any cross-origin call and the chatbot widget cannot tell the
  // user how long to wait. The API and the front end are separate origins in
  // every deployment that does not proxy /api, so this is the normal case, not
  // an edge one. Exposing them leaks nothing: the same values are already in
  // the response the caller just received.
  //
  // The conversation id rides the same rule: the chatbot widget reads it off
  // every POST /message response to learn which thread the turn landed in, and
  // without this the browser hides it from the page exactly like the
  // rate-limit values.
  exposedHeaders: [
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "retry-after",
    CHATBOT_CONVERSATION_ID_HEADER,
  ],
};

export default fp<FastifyCorsOptions>(
  async (fastify, opts) => {
    await fastify.register(cors, opts);
  },
  { name: "cors-plugin" }
);
