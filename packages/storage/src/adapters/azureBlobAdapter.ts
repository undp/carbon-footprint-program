import {
  BlobServiceClient,
  BlobSASPermissions,
  SASProtocol,
  RestError,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  type ContainerClient,
  type BlobSASSignatureValues,
  type UserDelegationKey,
} from "@azure/storage-blob";
import { HttpUploadMethod } from "@repo/types";
import type { Readable } from "node:stream";
import { getStorageCredential } from "../internal/getStorageCredential.js";
import {
  type AzureStorageConfig,
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

const COPY_TIMEOUT_MS = 30_000;
const COPY_SOURCE_SAS_MINUTES = 5;

class AzureBlobAdapter implements StorageAdapter {
  constructor(
    private readonly blobServiceClient: BlobServiceClient,
    private readonly containerClient: ContainerClient,
    private readonly containerName: string,
    private readonly defaultExpiryMinutes: number
  ) {}

  /**
   * Fully-qualified blob URL for the current endpoint, with the SAS token
   * appended. Deriving the host from the blob client (rather than hardcoding
   * `*.blob.core.windows.net`) keeps the URL valid for Azurite and for
   * sovereign / custom-endpoint deployments.
   */
  private blobUrlWithSas(blobPath: string, sasToken: string): string {
    return `${this.containerClient.getBlobClient(blobPath).url}?${sasToken}`;
  }

  /**
   * Resolves the credential used to sign SAS tokens. Account-key deployments
   * (and the Azurite test container) sign with the shared key directly;
   * managed-identity / service-principal deployments mint a short-lived user
   * delegation key — which requires Entra ID and is therefore unavailable to
   * shared-key endpoints such as Azurite.
   */
  private async resolveSasCredential(
    startsOn: Date,
    expiresOn: Date
  ): Promise<StorageSharedKeyCredential | UserDelegationKey> {
    const { credential } = this.blobServiceClient;
    if (credential instanceof StorageSharedKeyCredential) {
      return credential;
    }
    return this.blobServiceClient.getUserDelegationKey(startsOn, expiresOn);
  }

  /**
   * SAS protocol constraint derived from the endpoint scheme. Production
   * (HTTPS) endpoints — including all user-delegation SAS, which Azure only
   * permits over HTTPS — sign with `Https`; local HTTP endpoints (Azurite)
   * allow HTTP so the SAS is usable against them.
   */
  private get sasProtocol(): SASProtocol {
    return this.blobServiceClient.url.startsWith("https")
      ? SASProtocol.Https
      : SASProtocol.HttpsAndHttp;
  }

  private signSas(
    values: BlobSASSignatureValues,
    credential: StorageSharedKeyCredential | UserDelegationKey
  ): string {
    if (credential instanceof StorageSharedKeyCredential) {
      return generateBlobSASQueryParameters(values, credential).toString();
    }
    return generateBlobSASQueryParameters(
      values,
      credential,
      this.blobServiceClient.accountName
    ).toString();
  }

  async createReadUrlSigner(expiresInMinutes?: number): Promise<ReadUrlSigner> {
    const minutes = expiresInMinutes ?? this.defaultExpiryMinutes;
    const startsOn = new Date();
    const expiresAt = new Date(startsOn.getTime() + minutes * 60 * 1000);
    const credential = await this.resolveSasCredential(startsOn, expiresAt);

    return (blobPath, options) =>
      Promise.resolve({
        url: this.blobUrlWithSas(
          blobPath,
          this.signSas(
            {
              containerName: this.containerName,
              blobName: blobPath,
              permissions: BlobSASPermissions.parse("r"),
              startsOn,
              expiresOn: expiresAt,
              protocol: this.sasProtocol,
              ...(options?.contentType && { contentType: options.contentType }),
              ...(options?.contentDisposition && {
                contentDisposition: options.contentDisposition,
              }),
            },
            credential
          )
        ),
        expiresAt,
      });
  }

  async generateReadUrl(
    path: string,
    opts?: ReadOptions
  ): Promise<ReadUrlResult> {
    const signer = await this.createReadUrlSigner(opts?.expiresInMinutes);
    return signer(path, opts);
  }

  async generateWriteUrl(path: string): Promise<WriteUrlResult> {
    const minutes = this.defaultExpiryMinutes;
    const startsOn = new Date();
    const expiresAt = new Date(startsOn.getTime() + minutes * 60 * 1000);
    const credential = await this.resolveSasCredential(startsOn, expiresAt);

    const sasToken = this.signSas(
      {
        containerName: this.containerName,
        blobName: path,
        permissions: BlobSASPermissions.parse("cw"),
        startsOn,
        expiresOn: expiresAt,
        protocol: this.sasProtocol,
      },
      credential
    );

    return {
      url: this.blobUrlWithSas(path, sasToken),
      headers: { "x-ms-blob-type": "BlockBlob" },
      method: HttpUploadMethod.PUT,
      expiresAt,
    };
  }

  async streamObject(path: string): Promise<ObjectStream> {
    try {
      const response = await this.containerClient
        .getBlobClient(path)
        .download();
      const body = response.readableStreamBody;
      if (!body) {
        throw new Error(
          `Azure blob "${path}" download returned no readable stream`
        );
      }
      return {
        // Azure SDK types readableStreamBody as the wider NodeJS.ReadableStream;
        // under Node it is always a concrete Readable. `Readable` implements
        // `NodeJS.ReadableStream`, so this is a plain narrowing — no `unknown`.
        body: body as Readable,
        sizeBytes: response.contentLength ?? null,
        mimeType: response.contentType ?? null,
      };
    } catch (err) {
      if (err instanceof RestError && err.statusCode === 404) {
        throw new ObjectNotFoundError(path);
      }
      throw err;
    }
  }

  async headObject(path: string): Promise<ObjectMetadata> {
    try {
      const props = await this.containerClient
        .getBlobClient(path)
        .getProperties();
      if (props.contentLength == null) {
        throw new Error(
          `Blob "${path}" exists but contentLength is missing from getProperties() response`
        );
      }
      return {
        sizeBytes: props.contentLength,
        mimeType: props.contentType ?? "application/octet-stream",
      };
    } catch (err) {
      if (err instanceof RestError && err.statusCode === 404) {
        throw new ObjectNotFoundError(path);
      }
      throw err;
    }
  }

  async deleteObject(path: string): Promise<void> {
    await this.containerClient.getBlockBlobClient(path).deleteIfExists();
  }

  async putObject(
    path: string,
    body: Buffer | string,
    opts?: { contentType?: string }
  ): Promise<void> {
    const buffer = typeof body === "string" ? Buffer.from(body) : body;
    await this.containerClient
      .getBlockBlobClient(path)
      .upload(buffer, buffer.byteLength, {
        ...(opts?.contentType && {
          blobHTTPHeaders: { blobContentType: opts.contentType },
        }),
      });
  }

  async copyObject(src: string, dst: string): Promise<void> {
    if (src === dst) return;

    const { url: sourceUrl } = await this.generateReadUrl(src, {
      expiresInMinutes: COPY_SOURCE_SAS_MINUTES,
    });

    const destBlob = this.containerClient.getBlockBlobClient(dst);
    const copyOperation = await destBlob.beginCopyFromURL(sourceUrl);
    const timer = setTimeout(() => {
      void copyOperation.cancelOperation();
    }, COPY_TIMEOUT_MS);

    try {
      await copyOperation.pollUntilDone();
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.containerClient.exists();
  }
}

/** Builds an Azure Blob adapter from resolved configuration. */
export function createAzureBlobAdapter(
  config: AzureStorageConfig,
  expiryMinutes: number = DEFAULT_PRESIGNED_URL_EXPIRY_MINUTES
): StorageAdapter {
  const blobServiceClient = new BlobServiceClient(
    `https://${config.accountName}.blob.core.windows.net`,
    getStorageCredential({
      tenantId: config.tenantId,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    })
  );
  const containerClient = blobServiceClient.getContainerClient(
    config.containerName
  );

  return new AzureBlobAdapter(
    blobServiceClient,
    containerClient,
    config.containerName,
    expiryMinutes
  );
}

/**
 * Test-only factory: build an Azure adapter from an existing BlobServiceClient
 * (used by integration tests that point at Azurite via connection-string auth).
 * Exposed through the `@repo/storage/testing` subpath.
 */
export function createAzureBlobAdapterFromClient(
  blobServiceClient: BlobServiceClient,
  containerName: string,
  expiryMinutes: number = DEFAULT_PRESIGNED_URL_EXPIRY_MINUTES
): StorageAdapter {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  return new AzureBlobAdapter(
    blobServiceClient,
    containerClient,
    containerName,
    expiryMinutes
  );
}
