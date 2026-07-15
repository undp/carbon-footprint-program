import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import {
  buildDropzoneAcceptMap,
  downloadBlob,
  formatFileSize,
  formatMimeType,
  mergeUniqueFiles,
} from "./files";

describe("formatFileSize", () => {
  it.each<[number, string]>([
    [0, "0 B"],
    [1, "1 B"],
    [500, "500 B"],
    [999, "999 B"],
    // >= 1_000 → KB (rounded to a whole number).
    [1_000, "1 KB"],
    [1_499, "1 KB"],
    [1_500, "2 KB"],
    [12_340, "12 KB"],
    // Just below 1 MB still rounds within the KB branch.
    [999_999, "1000 KB"],
    // >= 1_000_000 → MB (one decimal place).
    [1_000_000, "1.0 MB"],
    [1_500_000, "1.5 MB"],
    [1_234_567, "1.2 MB"],
    [25_000_000, "25.0 MB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe("formatMimeType", () => {
  it.each<[string, string]>([
    ["application/pdf", "PDF"],
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Excel",
    ],
    ["application/vnd.ms-excel", "Excel"],
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Word",
    ],
    ["application/msword", "Word"],
    ["image/png", "PNG"],
    ["image/jpeg", "JPEG"],
    ["image/jpg", "JPEG"],
  ])("maps the known MIME type %s to %s", (mimeType, expected) => {
    expect(formatMimeType(mimeType)).toBe(expected);
  });

  it.each<[string, string]>([
    ["text/csv", "CSV"],
    ["application/json", "JSON"],
    ["video/mp4", "MP4"],
    ["image/webp", "WEBP"],
  ])(
    "falls back to the uppercased subtype for the unmapped MIME type %s",
    (mimeType, expected) => {
      expect(formatMimeType(mimeType)).toBe(expected);
    }
  );

  it.each<[string]>([[""], ["archivo-sin-barra"]])(
    "falls back to 'Archivo' when there is no subtype (%j)",
    (mimeType) => {
      expect(formatMimeType(mimeType)).toBe("Archivo");
    }
  );
});

describe("mergeUniqueFiles", () => {
  const makeFile = (
    name: string,
    content: string,
    type: string,
    lastModified: number
  ): File => new File([content], name, { type, lastModified });

  it("appends only incoming files whose fingerprint is not already present", () => {
    const existing = makeFile("a.txt", "aaa", "text/plain", 1_000);
    // Same name/size/type/lastModified as `existing` but a distinct instance:
    // deduped by fingerprint, not object identity.
    const duplicate = makeFile("a.txt", "aaa", "text/plain", 1_000);
    const fresh = makeFile("b.txt", "bbbb", "text/plain", 2_000);

    const result = mergeUniqueFiles([existing], [duplicate, fresh]);

    expect(result).toEqual([existing, fresh]);
    // Existing instance is preserved (not swapped for the duplicate).
    expect(result[0]).toBe(existing);
    expect(result[1]).toBe(fresh);
  });

  it("dedupes repeated incoming files against each other", () => {
    const first = makeFile("c.txt", "ccc", "text/plain", 3_000);
    const secondSameFingerprint = makeFile("c.txt", "ccc", "text/plain", 3_000);

    const result = mergeUniqueFiles([], [first, secondSameFingerprint]);

    expect(result).toEqual([first]);
  });

  it("keeps files that differ in any single fingerprint field", () => {
    const base = makeFile("d.txt", "ddd", "text/plain", 4_000);
    const differentName = makeFile("e.txt", "ddd", "text/plain", 4_000);
    const differentSize = makeFile("d.txt", "dddd", "text/plain", 4_000);
    const differentType = makeFile("d.txt", "ddd", "text/markdown", 4_000);
    const differentLastModified = makeFile("d.txt", "ddd", "text/plain", 4_001);

    const result = mergeUniqueFiles(
      [base],
      [differentName, differentSize, differentType, differentLastModified]
    );

    expect(result).toHaveLength(5);
    expect(result).toEqual([
      base,
      differentName,
      differentSize,
      differentType,
      differentLastModified,
    ]);
  });

  it("returns all incoming files when there are no existing files", () => {
    const a = makeFile("f.txt", "f", "text/plain", 5_000);
    const b = makeFile("g.txt", "g", "text/plain", 6_000);

    expect(mergeUniqueFiles([], [a, b])).toEqual([a, b]);
  });
});

describe("buildDropzoneAcceptMap", () => {
  it("maps zip MIME types to the .zip extension fallback", () => {
    expect(buildDropzoneAcceptMap(["application/zip"])).toEqual({
      "application/zip": [".zip"],
    });
    expect(buildDropzoneAcceptMap(["application/x-zip-compressed"])).toEqual({
      "application/x-zip-compressed": [".zip"],
    });
  });

  it("maps non-zip MIME types to an empty extension list", () => {
    expect(buildDropzoneAcceptMap(["application/pdf", "image/png"])).toEqual({
      "application/pdf": [],
      "image/png": [],
    });
  });

  it("handles a mixed list and an empty list", () => {
    expect(
      buildDropzoneAcceptMap(["application/zip", "application/pdf"])
    ).toEqual({
      "application/zip": [".zip"],
      "application/pdf": [],
    });
    expect(buildDropzoneAcceptMap([])).toEqual({});
  });
});

describe("downloadBlob", () => {
  const FAKE_URL = "blob:fake-url";

  const createObjectURL = vi.fn<typeof URL.createObjectURL>(() => FAKE_URL);
  const revokeObjectURL = vi.fn<typeof URL.revokeObjectURL>();
  let clickSpy: MockInstance;
  let removeSpy: MockInstance;
  let capturedAnchor: HTMLAnchorElement | null;

  beforeEach(() => {
    vi.useFakeTimers();
    capturedAnchor = null;

    // jsdom doesn't implement these object-URL methods; install test stubs. A
    // fresh jsdom global is created per test file, so no cross-file restore is
    // needed — these assignments don't leak into other suites.
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    // Capture the anchor the helper creates so we can assert on its attributes.
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const element = realCreateElement(tagName, options);
        if (tagName === "a") {
          capturedAnchor = element as HTMLAnchorElement;
        }
        return element;
      }
    );

    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    removeSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "remove")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it("wires up an anchor, clicks it, and revokes the URL after 100ms", () => {
    const blob = new Blob(["contenido"], { type: "application/zip" });

    downloadBlob(blob, "inventario.zip");

    // Object URL created from the blob and set as the anchor target.
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor?.getAttribute("href")).toBe(FAKE_URL);
    expect(capturedAnchor?.download).toBe("inventario.zip");

    // The download is triggered by a synthetic click, then the node is removed.
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);

    // Revoke is deferred: it must not run before the 100ms timer elapses.
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(FAKE_URL);
  });
});
