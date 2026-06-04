import type { Readable } from "node:stream";
import { HttpUploadMethod } from "@repo/types";

/** Result of issuing a presigned read URL. */
export interface SasUrlResult {
  url: string;
  expiresAt: Date;
}

/** Per-call overrides for content-type and content-disposition on read URLs. */
export interface ReadOptions {
  contentType?: string;
  contentDisposition?: string;
}

/** Result of issuing a presigned write URL. Carries the upload protocol the client must follow. */
export interface WriteUrlResult {
  url: string;
  headers: Record<string, string>;
  method: HttpUploadMethod;
  expiresAt: Date;
}

/** Object existence + size/mime info returned by `headObject`. */
export interface ObjectMetadata {
  sizeBytes: number;
  mimeType: string;
}

/** Streamed response from `streamObject`. Carries the bytes plus metadata for HTTP headers. */
export interface ObjectStream {
  body: Readable;
  sizeBytes: number | null;
  mimeType: string | null;
}

/** Factory returned by `createReadUrlSigner` — signs many paths from one provider-side setup. */
export type ReadUrlSigner = (
  path: string,
  opts?: ReadOptions
) => Promise<SasUrlResult>;

/**
 * Thrown by `headObject` when the requested path does not exist in the backend.
 * Caught by helpers and translated into their own domain error (e.g. `FileNotFoundError`).
 */
export class ObjectNotFoundError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`Object not found at path: ${path}`);
    this.name = "ObjectNotFoundError";
    this.path = path;
  }
}

/**
 * Backend-agnostic object storage contract.
 *
 * One adapter per provider lives in `./adapters/`. Features depend on this
 * interface only and access it via `fastify.storage`.
 */
export interface StorageAdapter {
  generateReadUrl(
    path: string,
    opts?: ReadOptions,
    expiresInMinutes?: number
  ): Promise<SasUrlResult>;

  createReadUrlSigner(expiresInMinutes?: number): Promise<ReadUrlSigner>;

  generateWriteUrl(
    path: string,
    expiresInMinutes?: number
  ): Promise<WriteUrlResult>;

  /** Throws `ObjectNotFoundError` when the path does not exist. */
  headObject(path: string): Promise<ObjectMetadata>;

  /** Streams the object bytes for direct piping into an HTTP response. Throws `ObjectNotFoundError` when the path does not exist. */
  streamObject(path: string): Promise<ObjectStream>;

  /**
   * Direct server-side write (no presigned URL). Used by tests to seed
   * fixtures and by server-side workflows that already hold the bytes.
   * Production upload paths SHOULD use `generateWriteUrl` so the client
   * uploads directly to the backend without round-tripping through the API.
   */
  putObject(
    path: string,
    body: Buffer | string,
    opts?: { contentType?: string }
  ): Promise<void>;

  /** Idempotent: succeeds when the path does not exist. */
  deleteObject(path: string): Promise<void>;

  /** Awaits until the copy is complete in the backend. */
  copyObject(src: string, dst: string): Promise<void>;

  /** Verifies the configured bucket/container is reachable. */
  healthCheck(): Promise<boolean>;
}
