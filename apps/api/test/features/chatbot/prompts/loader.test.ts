import { describe, it, expect } from "vitest";
import { getSystemPromptEs } from "@/features/chatbot/prompts/loader.js";

const SYSTEM_PROMPT_ES = getSystemPromptEs();

describe("System prompt", () => {
  it("contains the three-mode routing block", () => {
    expect(SYSTEM_PROMPT_ES).toContain("Modo A — Metodología");
    expect(SYSTEM_PROMPT_ES).toContain("Modo B — Plataforma");
    expect(SYSTEM_PROMPT_ES).toContain("Modo C — Conversacional");
  });

  it("contains the platform-redirect literal byte-for-byte", () => {
    expect(SYSTEM_PROMPT_ES).toContain(
      "Esa pregunta corresponde al uso de la plataforma Huella Latam. Esa funcionalidad estará disponible en una próxima versión del asistente; por ahora puedo ayudarte con preguntas sobre metodología de huella de carbono."
    );
  });

  it("contains the off-domain redirect literal byte-for-byte", () => {
    expect(SYSTEM_PROMPT_ES).toContain(
      "Solo puedo ayudarte con preguntas sobre metodología de huella de carbono, factores de emisión, los alcances 1, 2 y 3, y el uso de la plataforma Huella Latam. ¿En qué de esos temas te puedo ayudar?"
    );
  });

  it("contains the K=0 opener literal", () => {
    expect(SYSTEM_PROMPT_ES).toContain(
      "No dispongo de fuentes verificadas en mi corpus para responder esto con precisión."
    );
  });

  it("uses the forward-compatible identity literal", () => {
    expect(SYSTEM_PROMPT_ES).toContain(
      "Eres el Asistente de Huella Latam, una plataforma para medir y reducir"
    );
  });

  // Without verified sources the assistant must not hand out numbers: a user
  // copies them into a formal inventory, where they can disagree with the
  // platform's own factors. An earlier version allowed "factores aproximados,
  // cifras orientativas" if qualified; this guards against it coming back.
  it("forbids numeric values when no sources are found", () => {
    expect(SYSTEM_PROMPT_ES).toContain(
      "PROHIBIDO en este escenario: entregar cualquier valor numérico"
    );
    expect(SYSTEM_PROMPT_ES).not.toContain("cifras orientativas");
    expect(SYSTEM_PROMPT_ES).not.toContain("factores aproximados");
  });
});
