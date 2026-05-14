import type { LlmToolDefinition } from "@/features/chatbot/llmProvider/types.js";

export const SEARCH_KNOWLEDGE_TOOL_NAME = "searchKnowledge";

export const searchKnowledgeToolDefinition: LlmToolDefinition = {
  name: SEARCH_KNOWLEDGE_TOOL_NAME,
  description:
    "Búsqueda semántica sobre el corpus de metodología de huella de carbono " +
    "(GHG Protocol, IPCC, ISO 14064, normativas nacionales). Usa esta " +
    "herramienta SOLO para preguntas educativas sobre huella de carbono, " +
    "factores de emisión, alcances 1/2/3, GWP, y metodología de cálculo. NO " +
    "la uses para preguntas sobre el uso de la plataforma Huella Latam " +
    "(navegación, creación de inventarios, configuración, soporte) — esa " +
    "funcionalidad pertenece a una próxima versión del asistente. NO la " +
    "uses para saludos ni preguntas fuera del dominio de huella de carbono.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "La pregunta del usuario sobre metodología de huella de carbono, en español.",
        // Length bounds: 1–2000 chars matches a reasonable upper-bound user
        // question and stays well below the 512-token limit enforced by
        // searchKnowledge (~4 chars/token ≈ 2048 chars). Empty / oversized
        // tool calls are also defended against by execute.ts (untrusted-input
        // hardening) and searchKnowledge (InvalidQueryError) — these JSON
        // Schema bounds are the first line of defence, signalling intent
        // to the model so it stops attempting no-op or wildly oversized
        // queries before the request is issued.
        minLength: 1,
        maxLength: 2000,
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};
