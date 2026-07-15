import { describe, expect, it } from "vitest";
import { classifyUnknownContentType } from "@/plugins/app/contentTypeNormalizer.js";

// Unit tests for the catch-all content-type decision. Only a bodyless DELETE
// with an undefined Content-Type is accepted (for proxies/gateways that strip
// it); everything else is a 415.

describe("classifyUnknownContentType", () => {
  it("accepts a bodyless DELETE with an undefined Content-Type", () => {
    const decision = classifyUnknownContentType({
      method: "DELETE",
      contentType: undefined,
      url: "/api/resource/1",
      bodyLength: 0,
    });
    expect(decision).toEqual({ accept: true });
  });

  it.each([
    ["DELETE with a Content-Type", "DELETE", "application/json", 0],
    ["DELETE with a non-empty body", "DELETE", undefined, 12],
    ["a POST with no Content-Type", "POST", undefined, 0],
    ["a GET with a Content-Type", "GET", "text/plain", 5],
  ])("rejects %s with a 415", (_name, method, contentType, bodyLength) => {
    const decision = classifyUnknownContentType({
      method,
      contentType,
      url: "/api/resource",
      bodyLength,
    });
    expect(decision.accept).toBe(false);
    if (decision.accept) throw new Error("expected a rejection");
    expect(decision.error.statusCode).toBe(415);
  });

  it("names the offending content type in the error, or '(missing)' when absent", () => {
    const withType = classifyUnknownContentType({
      method: "PUT",
      contentType: "application/xml",
      url: "/x",
      bodyLength: 3,
    });
    if (withType.accept) throw new Error("expected a rejection");
    expect(withType.error.message).toContain("application/xml");

    const withoutType = classifyUnknownContentType({
      method: "PATCH",
      contentType: undefined,
      url: "/x",
      bodyLength: 3,
    });
    if (withoutType.accept) throw new Error("expected a rejection");
    expect(withoutType.error.message).toContain("(missing)");
  });
});
