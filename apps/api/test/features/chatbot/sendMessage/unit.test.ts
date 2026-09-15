import { describe, it, expect } from "vitest";
import {
  CHATBOT_MAX_HISTORY_TOKENS,
  CHATBOT_MAX_USER_INPUT_TOKENS,
} from "@/config/constants.js";
import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";
import { trimHistoryToBudget } from "@/features/chatbot/sendMessage/service.js";

/** Content whose estimated cost is exactly `tokens` (4 chars per token). */
const sized = (tokens: number): string => "a".repeat(tokens * 4);

const msg = (id: string, tokens: number) => ({ id, content: sized(tokens) });

const SYSTEM = sized(200);
const USER = sized(50);
const FIXED = estimateTokens(SYSTEM) + estimateTokens(USER);
const ROOM = CHATBOT_MAX_HISTORY_TOKENS - FIXED;

const cost = (history: { content: string }[]): number =>
  history.reduce((sum, m) => sum + estimateTokens(m.content), 0);

describe("trimHistoryToBudget", () => {
  it("keeps the whole history when it fits", () => {
    const history = [msg("a", 10), msg("b", 10), msg("c", 10)];

    expect(trimHistoryToBudget(history, SYSTEM, USER)).toEqual(history);
  });

  it("drops from the OLDEST end, keeping the messages nearest the question", () => {
    // Three rows that together exceed the room left after the fixed cost, so
    // exactly one has to go — and it must be the first.
    const half = Math.floor(ROOM / 2);
    const history = [msg("oldest", half), msg("mid", half), msg("newest", 10)];

    const kept = trimHistoryToBudget(history, SYSTEM, USER);

    expect(kept.map((m) => m.id)).toEqual(["mid", "newest"]);
  });

  it("returns a contiguous chronological suffix, never a gap in the middle", () => {
    const history = Array.from({ length: 12 }, (_, i) =>
      msg(String(i), Math.ceil(ROOM / 5))
    );

    const kept = trimHistoryToBudget(history, SYSTEM, USER);
    const ids = kept.map((m) => Number(m.id));

    expect(ids.length).toBeGreaterThan(0);
    // Ascending and with no holes: each id is its predecessor plus one.
    expect(ids).toEqual(
      Array.from({ length: ids.length }, (_, i) => ids[0] + i)
    );
    // And the suffix ends at the newest message.
    expect(ids[ids.length - 1]).toBe(history.length - 1);
  });

  it("produces a prompt that fits the budget", () => {
    const history = Array.from({ length: 40 }, (_, i) => msg(String(i), 500));

    const kept = trimHistoryToBudget(history, SYSTEM, USER);

    expect(cost(kept) + FIXED).toBeLessThanOrEqual(CHATBOT_MAX_HISTORY_TOKENS);
  });

  it("drops everything rather than refusing the turn when one old message is enormous", () => {
    // The regression this pins: the previous behaviour answered 413 here and
    // the conversation could never carry another message. Losing the history
    // is the correct trade — the turn still goes through.
    const history = [msg("enormous", CHATBOT_MAX_HISTORY_TOKENS * 2)];

    expect(trimHistoryToBudget(history, SYSTEM, USER)).toEqual([]);
  });

  it("charges the system prompt and the incoming message against the budget", () => {
    // Same history, bigger fixed cost → strictly less history survives. This
    // is what the old enforceHistoryCap got right and must not be lost: the
    // system prompt is part of every upstream request.
    const history = Array.from({ length: 30 }, (_, i) => msg(String(i), 300));

    const withSmallPrompt = trimHistoryToBudget(history, sized(100), USER);
    const withLargePrompt = trimHistoryToBudget(history, sized(3000), USER);

    expect(withLargePrompt.length).toBeLessThan(withSmallPrompt.length);
  });

  it("throws when the fixed cost alone cannot fit, naming the misconfiguration", () => {
    // Unreachable with the shipped constants — asserted so a future tuning of
    // CHATBOT_MAX_HISTORY_TOKENS below the system prompt fails loudly instead
    // of sending a prompt that is known to be too large.
    expect(() =>
      trimHistoryToBudget([], sized(CHATBOT_MAX_HISTORY_TOKENS + 1), "")
    ).toThrow(/misconfigured/);
  });

  it("cannot be tripped by a maximum-size user message under the shipped constants", () => {
    const maxUser = sized(CHATBOT_MAX_USER_INPUT_TOKENS);
    const systemPrompt = sized(1088); // the real prompt's measured size

    expect(() =>
      trimHistoryToBudget([msg("a", 10)], systemPrompt, maxUser)
    ).not.toThrow();
  });
});
