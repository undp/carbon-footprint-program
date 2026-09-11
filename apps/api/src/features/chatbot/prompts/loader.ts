import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT_PATH = resolve(__dirname, "es/system.md");

let cached: string | null = null;

/**
 * Read the Spanish system prompt, memoized after the first successful read.
 *
 * Deliberately lazy rather than a module-level constant. `@fastify/autoload`
 * imports the chatbot route module on every boot — the `CHATBOT_ENABLED` gate
 * lives *inside* the registration function, not around the import — so a
 * top-level read runs even in deployments that have the chatbot switched off. A
 * missing or empty prompt file would then take down the whole API at boot,
 * including for operators running the platform with no AI at all, which is
 * exactly the optionality that flag exists to guarantee.
 *
 * The file ships via the `cpy` step in this workspace's `build` script, because
 * `tsc` emits JavaScript only and would otherwise leave the Markdown behind.
 */
export const getSystemPromptEs = (): string => {
  if (cached !== null) return cached;
  const raw = readFileSync(SYSTEM_PROMPT_PATH, "utf8");
  if (raw.trim().length === 0) {
    throw new Error(
      `System prompt at ${SYSTEM_PROMPT_PATH} is empty — cannot serve the chatbot.`
    );
  }
  cached = raw;
  return cached;
};
