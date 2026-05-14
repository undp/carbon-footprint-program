import { ChatMessageRole } from "@repo/database/enums";
import type { LLMProvider, LlmMessage, LlmStreamEvent } from "./types.js";
import { estimateTokens } from "./estimateTokens.js";

const TOOL_CALL_KEYWORDS = ["alcance", "alcances", "protocolo", "factor"];

const findLatestUserMessage = (messages: LlmMessage[]): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === ChatMessageRole.USER) {
      return messages[i].content;
    }
  }
  return "";
};

const isSecondRound = (messages: LlmMessage[]): boolean => {
  // The handler builds the second-round messages array as
  // [...history, USER, ASSISTANT(toolCalls), TOOL] before re-invoking the
  // provider, so the LAST two entries are always the round-1 ASSISTANT(toolCalls)
  // followed by the TOOL result. Scoping the check to the tail keeps later
  // turns of the same conversation from incorrectly skipping routing because
  // an OLDER ASSISTANT(toolCalls)+TOOL pair lives somewhere in the history.
  if (messages.length < 2) return false;
  const last = messages[messages.length - 1];
  const prev = messages[messages.length - 2];
  return (
    last.role === ChatMessageRole.TOOL &&
    prev.role === ChatMessageRole.ASSISTANT &&
    !!prev.toolCalls &&
    prev.toolCalls.length > 0
  );
};

const isPlatformQuery = (text: string): boolean => {
  const lower = text.toLowerCase();
  // Heuristic: look for clear platform-usage cues. Used only by the mock to
  // avoid emitting the searchKnowledge tool_call on Modo B turns when the
  // query also matches a tool keyword (e.g. "factor" in "factores de
  // emisión") — keep production behavior to the real model.
  const platformCues = [
    "cómo crear",
    "como crear",
    "cómo creo",
    "como creo",
    "cómo invitar",
    "como invitar",
    "cómo invito",
    "como invito",
    "cómo solicito",
    "cómo solicitar",
    "como solicito",
    "como solicitar",
    "navegación",
    "configuración",
    "configurar",
    "dónde veo",
    "donde veo",
    "plataforma",
    "uso de la plataforma",
    "interfaz",
    "menú",
    "pantalla",
  ];
  return platformCues.some((cue) => lower.includes(cue));
};

const isOffDomainQuery = (text: string): boolean => {
  const lower = text.toLowerCase();
  // Sub-modo C.1 fixtures. Hardcoded to keep welcome/orientation cues
  // ("hola", "ayuda", "qué puedes hacer", "gracias", "cómo estás") out of
  // the off-domain branch — those still belong to Modo C.2 / the eco
  // fallback. Production routing is the real model's job; this list only
  // covers the smoke-friendly fixtures named in the system prompt.
  const offDomainCues = [
    "marte",
    "2+2",
    "clima en santiago",
    "mundial",
    "messi",
    "población",
  ];
  return offDomainCues.some((cue) => lower.includes(cue));
};

const splitIntoChunks = (text: string, minChunks: number): string[] => {
  const words = text.split(/(\s+)/).filter((part) => part.length > 0);
  if (words.length <= minChunks) return words;
  const chunkSize = Math.ceil(words.length / minChunks);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(""));
  }
  return chunks;
};

const REDIRECT_LITERAL =
  "Esa pregunta corresponde al uso de la plataforma Huella Latam. Esa funcionalidad estará disponible en una próxima versión del asistente; por ahora puedo ayudarte con preguntas sobre metodología de huella de carbono.";

const OFF_DOMAIN_REDIRECT_LITERAL =
  "Solo puedo ayudarte con preguntas sobre metodología de huella de carbono, factores de emisión, los alcances 1, 2 y 3, y el uso de la plataforma Huella Latam. ¿En qué de esos temas te puedo ayudar?";

const findLatestToolMessage = (messages: LlmMessage[]): string | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === ChatMessageRole.TOOL) {
      return messages[i].content;
    }
  }
  return null;
};

const isEmptyToolResult = (toolContent: string | null): boolean => {
  if (!toolContent) return false;
  return toolContent.includes("0 fuentes válidas encontradas");
};

const K0_OPENER =
  "No dispongo de fuentes verificadas en mi corpus para responder esto con precisión.";

let toolCallCounter = 0;

export const mockProvider: LLMProvider = {
  async *streamCompletion(messages, options): AsyncIterable<LlmStreamEvent> {
    const userMessage = findLatestUserMessage(messages);
    const joinedInput = messages.map((m) => m.content).join("\n");
    const lower = userMessage.toLowerCase();
    const matchesToolKeyword = TOOL_CALL_KEYWORDS.some((kw) =>
      lower.includes(kw)
    );

    // Second round: a TOOL message follows an ASSISTANT(toolCalls) message.
    // Yield an answer derived from the tool result instead of another tool_call.
    if (isSecondRound(messages)) {
      const toolContent = findLatestToolMessage(messages);
      const output = isEmptyToolResult(toolContent)
        ? `${K0_OPENER} Si lo deseas, puedes consultar fuentes externas autorizadas como el GHG Protocol Corporate Standard.`
        : `Según las fuentes consultadas: ${userMessage}. Esta es una respuesta de mock con citas.`;
      const chunks = splitIntoChunks(output, 3);
      for (const chunk of chunks) {
        if (options.signal?.aborted) return;
        await Promise.resolve();
        yield { type: "delta", content: chunk };
      }
      if (options.signal?.aborted) return;
      yield {
        type: "usage",
        inputTokens: estimateTokens(joinedInput),
        outputTokens: estimateTokens(output),
      };
      return;
    }

    // Modo B: platform-usage redirect. Avoid emitting tool_call so the mock
    // exercises the routing scaffold and lets tests assert the redirect.
    if (isPlatformQuery(userMessage)) {
      const chunks = splitIntoChunks(REDIRECT_LITERAL, 3);
      for (const chunk of chunks) {
        if (options.signal?.aborted) return;
        await Promise.resolve();
        yield { type: "delta", content: chunk };
      }
      if (options.signal?.aborted) return;
      yield {
        type: "usage",
        inputTokens: estimateTokens(joinedInput),
        outputTokens: estimateTokens(REDIRECT_LITERAL),
      };
      return;
    }

    // Modo A: emit tool_call when the user message matches a documented keyword
    // and the model has tools available. Per chatbot-llm-provider spec scenario
    // "Tool-call event terminates the stream", no further events SHALL be
    // yielded after tool_call — the previous trailing usage yield violated
    // that contract and produced a stale round-1 usage value the handler
    // double-counted in tokens_used (see chatbot-message-streaming spec
    // scenario "tokens_used on a tool turn uses the SECOND usage event").
    const toolsAvailable = (options.tools?.length ?? 0) > 0;
    if (toolsAvailable && matchesToolKeyword) {
      toolCallCounter += 1;
      yield {
        type: "tool_call",
        id: `mock-call-${toolCallCounter}`,
        name: "searchKnowledge",
        arguments: JSON.stringify({ query: userMessage }),
      };
      return;
    }

    // Sub-modo C.1: off-domain redirect. Ordered AFTER the tool-keyword
    // check so a factual Modo A query that incidentally contains an
    // off-domain fixture (none today, but defensive) still routes through
    // the tool. Yield the redirect literal byte-for-byte instead of the
    // eco template so the mock matches the system-prompt contract for
    // out-of-scope questions.
    if (isOffDomainQuery(userMessage)) {
      const chunks = splitIntoChunks(OFF_DOMAIN_REDIRECT_LITERAL, 3);
      for (const chunk of chunks) {
        if (options.signal?.aborted) return;
        await Promise.resolve();
        yield { type: "delta", content: chunk };
      }
      if (options.signal?.aborted) return;
      yield {
        type: "usage",
        inputTokens: estimateTokens(joinedInput),
        outputTokens: estimateTokens(OFF_DOMAIN_REDIRECT_LITERAL),
      };
      return;
    }

    // Fallback: deterministic eco template (foundation behavior).
    const output = `Recibí: ${userMessage}. Esta es una respuesta de mock.`;
    const chunks = splitIntoChunks(output, 3);

    for (const chunk of chunks) {
      if (options.signal?.aborted) return;
      // Yield to the event loop so consumers observe deltas as separate
      // microtasks — keeps the streaming behavior testable and lets the
      // signal propagate between chunks.
      await Promise.resolve();
      yield { type: "delta", content: chunk };
    }

    if (options.signal?.aborted) return;

    yield {
      type: "usage",
      inputTokens: estimateTokens(joinedInput),
      outputTokens: estimateTokens(output),
    };
  },
};
