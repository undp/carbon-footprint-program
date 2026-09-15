import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import { executeSearchKnowledgeTool } from "@/features/chatbot/tools/searchKnowledge/index.js";

describe("executeSearchKnowledgeTool — malformed arguments", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: generatePrismaAdapter(inject("databaseUrl")),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Every one of these used to be — or looks like it should be — a lost turn.
   * The tool contract is that a badly-shaped argument degrades to the
   * empty-result fallback, which the system prompt already renders honestly as
   * the K=0 opener. Only a genuine failure (provider down, connection dropped)
   * should be allowed to end the turn.
   */
  it("degrades an over-long query to the empty result instead of throwing", async () => {
    // searchKnowledge refuses past QUERY_TOKEN_LIMIT (512 tokens ≈ 2048 chars).
    // The tool schema advertises maxLength 2000, but that is a hint the model
    // is free to ignore — and when it did, InvalidQueryError escaped here, hit
    // the handler's catch, and answered 503.
    const args = JSON.stringify({ query: "a".repeat(4000) });

    const result = await executeSearchKnowledgeTool(prisma, args);

    expect(result.validSources).toEqual([]);
    expect(result.chunks).toEqual([]);
    expect(result.toolResultMessage).toContain("0 fuentes válidas");
  });

  it("degrades an empty query the same way", async () => {
    const result = await executeSearchKnowledgeTool(
      prisma,
      JSON.stringify({ query: "   " })
    );

    expect(result.validSources).toEqual([]);
  });

  it("degrades unparseable JSON", async () => {
    const result = await executeSearchKnowledgeTool(prisma, "{not json");

    expect(result.validSources).toEqual([]);
  });

  it("degrades arguments that do not match the schema", async () => {
    const result = await executeSearchKnowledgeTool(
      prisma,
      JSON.stringify({ wrongField: 1 })
    );

    expect(result.validSources).toEqual([]);
  });
});
