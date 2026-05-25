import { describe, expect, it } from "vitest";
import {
  FILE_UPLOAD_POLICIES,
  FILE_UPLOAD_TYPES,
  type FileUploadType,
} from "@repo/constants";
import {
  buildAcceptFromPolicy,
  getPolicyAccept,
} from "./buildAcceptFromPolicy";

describe("buildAcceptFromPolicy", () => {
  describe.each<FileUploadType>(FILE_UPLOAD_TYPES)("policy %s", (useCase) => {
    it("includes every allowed MIME as a key in the accept map", () => {
      const accept = getPolicyAccept(useCase);
      for (const mime of FILE_UPLOAD_POLICIES[useCase].allowedMimeTypes) {
        expect(accept).toHaveProperty(mime);
      }
    });

    it("places every allowed extension under some MIME in the accept map", () => {
      const accept = getPolicyAccept(useCase);
      const allExtensions = Object.values(accept).flat();
      for (const ext of FILE_UPLOAD_POLICIES[useCase].allowedExtensions) {
        expect(allExtensions).toContain(ext);
      }
    });
  });

  it("throws when a policy contains an extension with no MIME mapping", () => {
    expect(() =>
      buildAcceptFromPolicy({
        allowedExtensions: [".unknown-ext"],
        allowedMimeTypes: ["application/pdf"],
      })
    ).toThrow(/no MIME mapping/);
  });
});
