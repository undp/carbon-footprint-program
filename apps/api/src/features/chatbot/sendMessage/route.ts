import {
  SendMessageRequestBodySchema,
  type SendMessageRequestBody,
} from "@repo/types";
import { z } from "zod";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { chatbotIdentityPreHandler } from "@/features/chatbot/helpers/identity.js";
import { sendMessageHandler } from "./handler.js";

// 200 schema is documentation-only — the handler hijacks the response and
// writes an SSE wire stream directly. Fastify's Zod type provider does not
// serialize a JSON body for hijacked responses.
const SendMessageStreamSchema = z
  .string()
  .describe(
    "text/event-stream — `data:` SSE events with assistant deltas, terminal `event: done` carrying { inputTokens, outputTokens }, or terminal `event: error` carrying { code, message } on mid-stream provider failure."
  );

export const sendMessageRoute: StandardRouteSignature = (fastify, options) => {
  fastify.post<{ Body: SendMessageRequestBody }>(
    "/message",
    {
      config: { public: options?.public ?? true },
      schema: {
        tags: ["chatbot"],
        summary: "Send a chat message and stream the assistant response",
        description:
          "Streams an assistant response via Server-Sent Events. Accepts both authenticated and anonymous callers (anonymous identity tracked via the signed `chatbot_session_id` cookie).",
        body: SendMessageRequestBodySchema,
        response: {
          200: SendMessageStreamSchema,
          400: ApiErrorResponseSchema,
          413: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      preHandler: [chatbotIdentityPreHandler({ requireIdentity: true })],
    },
    sendMessageHandler
  );
};
