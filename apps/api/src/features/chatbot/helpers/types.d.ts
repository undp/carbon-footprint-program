import type { ChatbotIdentity } from "./identity.js";

declare module "fastify" {
  interface FastifyRequest {
    chatbotIdentity?: ChatbotIdentity;
  }
}
