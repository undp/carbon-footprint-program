import { describe, it, expect } from "vitest";
import { InvalidQueryError } from "@/features/chatbot/searchKnowledge/index.js";

// Pure validation tests that do not need a Prisma client. The DB-bound
// scenarios live in the integration test file (run when Docker is available).

describe("searchKnowledge — validation surface", () => {
  it("InvalidQueryError carries the documented stable name", () => {
    const error = new InvalidQueryError("test");
    expect(error.name).toBe("InvalidQueryError");
    expect(error).toBeInstanceOf(Error);
  });
});
