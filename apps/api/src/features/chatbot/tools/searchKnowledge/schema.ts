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
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};
