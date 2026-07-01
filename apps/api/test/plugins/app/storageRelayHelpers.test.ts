import { describe, expect, it } from "vitest";

import { resolveRelayTarget } from "@/plugins/app/storageRelayPlugin.js";
import { STORAGE_RELAY_PREFIX } from "@/config/environment.js";

const url = (pathAndQuery: string) => `${STORAGE_RELAY_PREFIX}${pathAndQuery}`;

describe("resolveRelayTarget", () => {
  describe("preserves the signed bytes (path + query)", () => {
    it("carves a plain key path and its query", () => {
      const result = resolveRelayTarget(
        url(
          "/files/file-type/uuid-name.txt?X-Amz-Signature=abc&X-Amz-Credential=cred"
        ),
        STORAGE_RELAY_PREFIX
      );
      expect(result).toEqual({
        path: "/files/file-type/uuid-name.txt",
        query: "?X-Amz-Signature=abc&X-Amz-Credential=cred",
      });
    });

    it("keeps `%2B` ENCODED in the path (the bug: decoding it to `+` breaks the signature)", () => {
      const result = resolveRelayTarget(
        url("/files/foo%2Bbar.txt?X-Amz-Signature=abc"),
        STORAGE_RELAY_PREFIX
      );
      // Must NOT become "/files/foo+bar.txt" — that is the path mismatch.
      expect(result?.path).toBe("/files/foo%2Bbar.txt");
    });

    it("keeps `%20` encoded in the path", () => {
      const result = resolveRelayTarget(
        url("/files/my%20file.txt?X-Amz-Signature=abc"),
        STORAGE_RELAY_PREFIX
      );
      expect(result?.path).toBe("/files/my%20file.txt");
    });

    it("forwards the query verbatim — order and encoding untouched", () => {
      const query =
        "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=a%2Fb&X-Amz-Signature=abc";
      const result = resolveRelayTarget(
        url(`/files/key.txt${query}`),
        STORAGE_RELAY_PREFIX
      );
      expect(result?.query).toBe(query);
    });

    it("returns an empty query when there is none", () => {
      const result = resolveRelayTarget(
        url("/files/key.txt"),
        STORAGE_RELAY_PREFIX
      );
      expect(result?.query).toBe("");
    });

    it("does NOT reject a double-encoded `%252e` segment (fetch leaves it intact, so it is a normal key)", () => {
      const result = resolveRelayTarget(
        url("/files/%252e%252e/key.txt?X-Amz-Signature=abc"),
        STORAGE_RELAY_PREFIX
      );
      expect(result?.path).toBe("/files/%252e%252e/key.txt");
    });

    it("does NOT reject an empty `//` segment (not a dot-segment)", () => {
      const result = resolveRelayTarget(
        url("/files//key.txt?X-Amz-Signature=abc"),
        STORAGE_RELAY_PREFIX
      );
      expect(result?.path).toBe("/files//key.txt");
    });

    it("does NOT reject a malformed `%`-escape (cannot be a dot-segment)", () => {
      const result = resolveRelayTarget(
        url("/files/100%discount.txt?X-Amz-Signature=abc"),
        STORAGE_RELAY_PREFIX
      );
      expect(result?.path).toBe("/files/100%discount.txt");
    });
  });

  describe("rejects dot-segment traversal in every form fetch would collapse", () => {
    it.each([
      ["literal", "/files/../secret.txt"],
      ["percent-encoded", "/files/%2e%2e/secret.txt"],
      ["uppercase percent-encoded", "/files/%2E%2E/secret.txt"],
      ["mixed `.%2e`", "/files/.%2e/secret.txt"],
      ["mixed `%2e.`", "/files/%2e./secret.txt"],
      ["single literal dot", "/files/./secret.txt"],
      ["single encoded dot", "/files/%2e/secret.txt"],
    ])("rejects a %s dot-segment", (_label, path) => {
      expect(
        resolveRelayTarget(
          url(`${path}?X-Amz-Signature=abc`),
          STORAGE_RELAY_PREFIX
        )
      ).toBeNull();
    });
  });

  describe("guards its contract", () => {
    it("returns null when the mount prefix does not match", () => {
      expect(
        resolveRelayTarget(
          "/wrong/files/key.txt?X-Amz-Signature=abc",
          STORAGE_RELAY_PREFIX
        )
      ).toBeNull();
    });
  });
});
