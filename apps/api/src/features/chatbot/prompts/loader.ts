import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT_PATH = resolve(__dirname, "es/system.md");

const loadSystemPrompt = (): string => {
  const raw = readFileSync(SYSTEM_PROMPT_PATH, "utf8");
  if (raw.trim().length === 0) {
    throw new Error(
      `System prompt at ${SYSTEM_PROMPT_PATH} is empty — cannot boot chatbot.`
    );
  }
  return raw;
};

export const SYSTEM_PROMPT_ES: string = loadSystemPrompt();
