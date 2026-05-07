import type { FastifyRequest, FastifyReply } from "fastify";
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
 * Auth: this route is mounted with `config.public = true` because the T&C is
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
  const downloadResponse = await blobClient.download();
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

  reply.header("Content-Type", file.mimeType);
  reply.header(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(file.originalName)}"`
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
