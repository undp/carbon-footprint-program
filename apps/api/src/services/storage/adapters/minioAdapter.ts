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
import { HttpUploadMethod } from "@repo/types";
import {
  MINIO_ACCESS_KEY,
  MINIO_BUCKET,
  MINIO_ENDPOINT,
  MINIO_FORCE_PATH_STYLE,
  MINIO_REGION,
  MINIO_SECRET_KEY,
} from "@/config/environment.js";
import { PRESIGNED_URL_EXPIRY_MINUTES } from "@/config/constants.js";
import type { Readable } from "node:stream";
import {
  ObjectNotFoundError,
  type ObjectMetadata,
  type ObjectStream,
  type ReadOptions,
  type ReadUrlSigner,
  type SasUrlResult,
  type StorageAdapter,
  type WriteOptions,
  type WriteUrlResult,
} from "../types.js";

function minutesToSeconds(minutes: number): number {
  return minutes * 60;
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
    private readonly bucket: string
  ) {}

  async generateReadUrl(
    path: string,
    opts?: ReadOptions
  ): Promise<SasUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ...(opts?.contentType && { ResponseContentType: opts.contentType }),
      ...(opts?.contentDisposition && {
        ResponseContentDisposition: opts.contentDisposition,
      }),
    });
    const expiresIn = minutesToSeconds(
      opts?.expiresInMinutes ?? PRESIGNED_URL_EXPIRY_MINUTES
    );
    const url = await getSignedUrl(this.s3, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return { url, expiresAt };
  }

  createReadUrlSigner(
    expiresInMinutes: number = PRESIGNED_URL_EXPIRY_MINUTES
  ): Promise<ReadUrlSigner> {
    // S3 presign is local and cheap per call — no provider-side setup to batch.
    return Promise.resolve((path, opts) =>
      this.generateReadUrl(path, { ...opts, expiresInMinutes })
    );
  }

  async generateWriteUrl(
    path: string,
    opts?: WriteOptions
  ): Promise<WriteUrlResult> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: path });
    const expiresIn = minutesToSeconds(
      opts?.expiresInMinutes ?? PRESIGNED_URL_EXPIRY_MINUTES
    );
    const url = await getSignedUrl(this.s3, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return {
      url,
      headers: {},
      method: HttpUploadMethod.PUT,
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
        // S3 SDK v3 in Node returns a Readable for Body.
        body: result.Body as unknown as Readable,
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

export function createMinioAdapter(): StorageAdapter {
  if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
    throw new Error(
      "STORAGE_PROVIDER=minio but MINIO_ENDPOINT, MINIO_ACCESS_KEY, or MINIO_SECRET_KEY is missing"
    );
  }

  const s3 = new S3Client({
    endpoint: MINIO_ENDPOINT,
    region: MINIO_REGION,
    forcePathStyle: MINIO_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY,
      secretAccessKey: MINIO_SECRET_KEY,
    },
  });

  return new MinioAdapter(s3, MINIO_BUCKET);
}

/**
 * Test-only factory: build a MinIO adapter from an existing S3Client (used by
 * integration tests that point at a MinIO testcontainer with dynamic ports).
 */
export function createMinioAdapterFromClient(
  s3: S3Client,
  bucket: string
): StorageAdapter {
  return new MinioAdapter(s3, bucket);
}
