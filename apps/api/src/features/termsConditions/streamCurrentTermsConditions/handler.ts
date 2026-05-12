import type { FastifyRequest, FastifyReply } from "fastify";
import { RestError } from "@azure/storage-blob";
import {
  FileNotFoundError,
  StorageNotConfiguredError,
} from "@/features/files/errors.js";
import { resolveCurrentTermsConditionsBlob } from "./service.js";

/**
 * Streams the current Terms & Conditions PDF directly from Azure Blob Storage
 * to the client. The URL of this endpoint is stable forever (no signed URL,
 * no expiration) so the link rendered on the public landing page can be
 * shared, bookmarked, and crawled without surprise.
 *
 * The PDF is NOT stored on the API server — the handler reads the blob via
 * the same managed-identity-backed ContainerClient used by the upload flow,
 * and pipes the bytes straight back as the HTTP response body.
 *
 * Auth: this route is mounted with `config.allowPublicAccess = true` because the T&C is
 * meant to be discoverable by anyone visiting the landing page.
 */
export const streamCurrentTermsConditionsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "termsConditions/stream" });
  const { prisma, blobStorage } = request.server;

  // Storage not wired up (e.g., a dev environment without
  // AZURE_STORAGE_ACCOUNT_NAME) — fail fast with a 503 rather than a confusing
  // 500 from inside the SDK.
  if (!blobStorage) throw new StorageNotConfiguredError();

  const file = await resolveCurrentTermsConditionsBlob(prisma);
  // No current T&C OR the row was soft-deleted between metadata and stream
  // requests — surface a 404 so the link renders an obvious error if a user
  // ever clicks it before any T&C has been published.
  if (!file) throw new FileNotFoundError("current");

  const blobClient = blobStorage.getBlobClient(file.blobPath);
  // The DB row may exist while the blob is gone (manual cleanup, container
  // restored from a partial backup, etc). Translate Azure's 404 into the
  // public 404 this endpoint already documents instead of leaking it as a
  // 500 from the SDK.
  let downloadResponse;
  try {
    downloadResponse = await blobClient.download();
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) {
      throw new FileNotFoundError("current");
    }
    throw err;
  }
  const stream = downloadResponse.readableStreamBody;

  // Defensive: the Azure SDK types `readableStreamBody` as optional.
  // In practice it is always defined for blob `download()` responses on
  // Node, but we guard against the type-level absence so the handler can
  // surface a clear error instead of crashing on `.pipe(undefined)`.
  if (!stream) {
    log.error(
      { blobPath: file.blobPath },
      "Azure download returned no readable stream"
    );
    throw new Error("Failed to obtain a readable stream from Azure");
  }

  // Force application/pdf rather than trusting persisted metadata: the
  // legal upload helper already rejects non-PDFs at confirm time, and
  // pinning the response Content-Type plus X-Content-Type-Options=nosniff
  // means a stale or tampered mimeType column cannot trick a browser into
  // inline-rendering arbitrary content under the public T&C URL.
  reply.header("Content-Type", "application/pdf");
  reply.header("X-Content-Type-Options", "nosniff");

  // Build a Content-Disposition header per RFC 6266 / RFC 5987:
  //   - filename="..."    : ASCII-only fallback for older clients. We
  //                         strip non-ASCII, quotes, and backslashes so the
  //                         quoted-string form is well-formed.
  //   - filename*=UTF-8''...: percent-encoded UTF-8 form preferred by
  //                           modern clients; preserves accents and
  //                           non-ASCII characters in the original name.
  // Using encodeURIComponent inside a quoted filename (the previous
  // implementation) leaked literal %XX sequences into the saved filename.
  const asciiFileName = file.originalName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  reply.header(
    "Content-Disposition",
    `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
  );

  if (downloadResponse.contentLength != null) {
    reply.header("Content-Length", downloadResponse.contentLength);
  }
  // Allow shared caches to serve the response for a short window. The T&C
  // is replaced rarely; a few minutes of staleness is fine and dramatically
  // reduces API/Azure egress when the landing page is heavily trafficked.
  reply.header("Cache-Control", "public, max-age=300");

  return reply.send(stream);
};
