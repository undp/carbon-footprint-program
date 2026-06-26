import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadBucketCommand,
  NotFound,
  S3ServiceException,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";
import {
  type MinioStorageConfig,
  DEFAULT_PRESIGNED_URL_EXPIRY_MINUTES,
} from "../config.js";
import {
  ObjectNotFoundError,
  type ObjectMetadata,
  type ObjectStream,
  type ReadOptions,
  type ReadUrlSigner,
  type ReadUrlResult,
  type StorageAdapter,
  type WriteUrlResult,
} from "../types.js";

function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

/**
 * Rewrites the ORIGIN of a presigned URL to a public reverse-proxy base,
 * preserving the signed path + query (the SigV4 signature) byte-for-byte. The
 * signature is computed against the internal endpoint, so only the string is
 * swapped here — never the host the client (`S3Client`) signs against.
 *
 * The public base may carry its own path prefix (e.g. "/api/storage"); that
 * prefix is prepended to the signed pathname so the relay route receives the
 * full "/<bucket>/<key>?X-Amz-..." after stripping its own mount.
 *
 *   signed:  http://192.168.50.157:9100/files/KEY?X-Amz-Algorithm=...
 *   base:    https://api.example.cl/api/storage
 *   result:  https://api.example.cl/api/storage/files/KEY?X-Amz-Algorithm=...
 */
function rewriteOrigin(signedUrl: string, publicBaseUrl: string): string {
  const signed = new URL(signedUrl);
  const base = new URL(publicBaseUrl);
  // Strip any trailing slash on the base path so the join is exactly one slash.
  const basePath = base.pathname.replace(/\/+$/, "");
  // Assemble by string so the already-encoded signed query is never re-encoded
  // (re-encoding the X-Amz-* params would invalidate the signature).
  return `${base.origin}${basePath}${signed.pathname}${signed.search}`;
}

function isNotFound(err: unknown): boolean {
  if (err instanceof NotFound) return true;
  if (err instanceof S3ServiceException) {
    return err.$metadata.httpStatusCode === 404 || err.name === "NotFound";
  }
  return false;
}

class MinioAdapter implements StorageAdapter {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
    private readonly defaultExpiryMinutes: number,
    // When set, presigned URLs are rewritten to this public relay base. The
    // S3Client still signs against the internal endpoint (see rewriteOrigin).
    private readonly publicBaseUrl?: string
  ) {}

  async generateReadUrl(
    path: string,
    opts?: ReadOptions
  ): Promise<ReadUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ...(opts?.contentType && { ResponseContentType: opts.contentType }),
      ...(opts?.contentDisposition && {
        ResponseContentDisposition: opts.contentDisposition,
      }),
    });
    const expiresIn = minutesToSeconds(
      opts?.expiresInMinutes ?? this.defaultExpiryMinutes
    );
    const signed = await getSignedUrl(this.s3, command, { expiresIn });
    const url = this.publicBaseUrl
      ? rewriteOrigin(signed, this.publicBaseUrl)
      : signed;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return { url, expiresAt };
  }

  createReadUrlSigner(expiresInMinutes?: number): Promise<ReadUrlSigner> {
    const minutes = expiresInMinutes ?? this.defaultExpiryMinutes;
    // S3 presign is local and cheap per call — no provider-side setup to batch.
    return Promise.resolve((path, opts) =>
      this.generateReadUrl(path, { ...opts, expiresInMinutes: minutes })
    );
  }

  async generateWriteUrl(path: string): Promise<WriteUrlResult> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: path });
    const expiresIn = minutesToSeconds(this.defaultExpiryMinutes);
    const signed = await getSignedUrl(this.s3, command, { expiresIn });
    const url = this.publicBaseUrl
      ? rewriteOrigin(signed, this.publicBaseUrl)
      : signed;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return {
      url,
      headers: {},
      method: "PUT",
      expiresAt,
    };
  }

  async streamObject(path: string): Promise<ObjectStream> {
    try {
      const result = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: path })
      );
      if (!result.Body) {
        throw new Error(`MinIO object "${path}" GetObject returned no body`);
      }
      return {
        // S3 SDK v3 types Body as a union of stream types; in Node it is always
        // the Readable arm. Narrow to it directly (no `unknown`) so a future SDK
        // change that drops Readable from the union still trips type-check.
        body: result.Body as Readable,
        sizeBytes: result.ContentLength ?? null,
        mimeType: result.ContentType ?? null,
      };
    } catch (err) {
      if (isNotFound(err)) {
        throw new ObjectNotFoundError(path);
      }
      throw err;
    }
  }

  async headObject(path: string): Promise<ObjectMetadata> {
    try {
      const result = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: path })
      );
      if (result.ContentLength == null) {
        throw new Error(
          `Object "${path}" exists but ContentLength is missing from HeadObject response`
        );
      }
      return {
        sizeBytes: result.ContentLength,
        mimeType: result.ContentType ?? "application/octet-stream",
      };
    } catch (err) {
      if (isNotFound(err)) {
        throw new ObjectNotFoundError(path);
      }
      throw err;
    }
  }

  async deleteObject(path: string): Promise<void> {
    // S3 DeleteObject is idempotent — succeeds even if the key does not exist.
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: path })
    );
  }

  async putObject(
    path: string,
    body: Buffer | string,
    opts?: { contentType?: string }
  ): Promise<void> {
    const input: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: path,
      Body: body,
      ...(opts?.contentType && { ContentType: opts.contentType }),
    };
    await this.s3.send(new PutObjectCommand(input));
  }

  async copyObject(src: string, dst: string): Promise<void> {
    if (src === dst) return;
    await this.s3.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: dst,
        CopySource: `${this.bucket}/${src.split("/").map(encodeURIComponent).join("/")}`,
      })
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}

/** Builds a MinIO / S3-compatible adapter from resolved configuration. */
export function createMinioAdapter(
  config: MinioStorageConfig,
  expiryMinutes: number = DEFAULT_PRESIGNED_URL_EXPIRY_MINUTES
): StorageAdapter {
  const s3 = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });

  return new MinioAdapter(
    s3,
    config.bucket,
    expiryMinutes,
    config.publicBaseUrl
  );
}

/**
 * Test-only factory: build a MinIO adapter from an existing S3Client (used by
 * integration tests that point at a MinIO testcontainer with dynamic ports).
 * Exposed through the `@repo/storage/testing` subpath.
 */
export function createMinioAdapterFromClient(
  s3: S3Client,
  bucket: string,
  expiryMinutes: number = DEFAULT_PRESIGNED_URL_EXPIRY_MINUTES,
  publicBaseUrl?: string
): StorageAdapter {
  return new MinioAdapter(s3, bucket, expiryMinutes, publicBaseUrl);
}
