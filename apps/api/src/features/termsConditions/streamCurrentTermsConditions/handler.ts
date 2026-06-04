import type { FastifyRequest, FastifyReply } from "fastify";
import { FileNotFoundError } from "@/features/files/errors.js";
import { ObjectNotFoundError } from "@/services/storage/index.js";
import { resolveCurrentTermsConditionsBlob } from "./service.js";

/**
 * Streams the current Terms & Conditions PDF directly from object storage to
 * the client. The URL of this endpoint is stable forever (no signed URL, no
 * expiration) so the link rendered on the public landing page can be shared,
 * bookmarked, and crawled without surprise.
 *
 * The PDF is NOT stored on the API server — the handler reads the object via
 * the configured storage adapter and pipes the bytes straight back as the
 * HTTP response body.
 *
 * Auth: this route is mounted with `config.allowPublicAccess = true` because the T&C is
 * meant to be discoverable by anyone visiting the landing page.
 */
export const streamCurrentTermsConditionsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "termsConditions/stream" });
  const { prisma, storage } = request.server;

  const file = await resolveCurrentTermsConditionsBlob(prisma);
  // No current T&C OR the row was soft-deleted between metadata and stream
  // requests — surface a 404 so the link renders an obvious error if a user
  // ever clicks it before any T&C has been published.
  if (!file) throw new FileNotFoundError("current");

  // The DB row may exist while the object is gone (manual cleanup, container
  // restored from a partial backup, etc). Translate the adapter's 404 into
  // the public 404 this endpoint already documents instead of leaking it as
  // a 500.
  let objectStream;
  try {
    objectStream = await storage.streamObject(file.blobPath);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      throw new FileNotFoundError("current");
    }
    throw err;
  }

  if (!objectStream.body) {
    log.error(
      { blobPath: file.blobPath },
      "Object storage returned no readable stream"
    );
    throw new Error("Failed to obtain a readable stream from storage");
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
  const asciiFileName = file.originalName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  reply.header(
    "Content-Disposition",
    `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
  );

  if (objectStream.sizeBytes != null) {
    reply.header("Content-Length", objectStream.sizeBytes);
  }
  // Allow shared caches to serve the response for a short window. The T&C
  // is replaced rarely; a few minutes of staleness is fine and dramatically
  // reduces API/storage egress when the landing page is heavily trafficked.
  reply.header("Cache-Control", "public, max-age=300");

  return reply.send(objectStream.body);
};
