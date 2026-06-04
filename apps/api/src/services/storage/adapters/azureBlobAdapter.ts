import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  SASProtocol,
  RestError,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  type BlobSASSignatureValues,
  type UserDelegationKey,
} from "@azure/storage-blob";
import { getStorageCredential } from "@repo/database/utils";
import { HttpUploadMethod } from "@repo/types";
import {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
  AZURE_STORAGE_TENANT_ID,
  AZURE_STORAGE_CLIENT_ID,
  AZURE_STORAGE_CLIENT_SECRET,
} from "@/config/environment.js";
import { PRESIGNED_URL_EXPIRY_MINUTES } from "@/config/constants.js";
import {
  ObjectNotFoundError,
  type ObjectMetadata,
  type ObjectStream,
  type ReadOptions,
  type ReadUrlSigner,
  type SasUrlResult,
  type StorageAdapter,
  type WriteUrlResult,
} from "../types.js";

const COPY_TIMEOUT_MS = 30_000;
const COPY_SOURCE_SAS_MINUTES = 5;

class AzureBlobAdapter implements StorageAdapter {
  constructor(
    private readonly blobServiceClient: BlobServiceClient,
    private readonly containerClient: ContainerClient,
    private readonly containerName: string
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

  async createReadUrlSigner(
    expiresInMinutes: number = PRESIGNED_URL_EXPIRY_MINUTES
  ): Promise<ReadUrlSigner> {
    const startsOn = new Date();
    const expiresAt = new Date(
      startsOn.getTime() + expiresInMinutes * 60 * 1000
    );
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
    opts?: ReadOptions,
    expiresInMinutes: number = PRESIGNED_URL_EXPIRY_MINUTES
  ): Promise<SasUrlResult> {
    const signer = await this.createReadUrlSigner(expiresInMinutes);
    return signer(path, opts);
  }

  async generateWriteUrl(
    path: string,
    expiresInMinutes: number = PRESIGNED_URL_EXPIRY_MINUTES
  ): Promise<WriteUrlResult> {
    const startsOn = new Date();
    const expiresAt = new Date(
      startsOn.getTime() + expiresInMinutes * 60 * 1000
    );
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
        // Azure SDK types readableStreamBody as NodeJS.ReadableStream; under
        // Node it is a Readable in practice (the response uses node-fetch).
        body: body as unknown as import("node:stream").Readable,
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

    const { url: sourceUrl } = await this.generateReadUrl(
      src,
      undefined,
      COPY_SOURCE_SAS_MINUTES
    );

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

export function createAzureBlobAdapter(): StorageAdapter {
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_CONTAINER_NAME) {
    throw new Error(
      "STORAGE_PROVIDER=azure_blob_storage but AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONTAINER_NAME is missing"
    );
  }

  const blobServiceClient = new BlobServiceClient(
    `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    getStorageCredential({
      tenantId: AZURE_STORAGE_TENANT_ID,
      clientId: AZURE_STORAGE_CLIENT_ID,
      clientSecret: AZURE_STORAGE_CLIENT_SECRET,
    })
  );
  const containerClient = blobServiceClient.getContainerClient(
    AZURE_STORAGE_CONTAINER_NAME
  );

  return new AzureBlobAdapter(
    blobServiceClient,
    containerClient,
    AZURE_STORAGE_CONTAINER_NAME
  );
}

/**
 * Test-only factory: build an Azure adapter from an existing BlobServiceClient
 * (used by integration tests that point at Azurite via connection-string auth).
 */
export function createAzureBlobAdapterFromClient(
  blobServiceClient: BlobServiceClient,
  containerName: string
): StorageAdapter {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  return new AzureBlobAdapter(
    blobServiceClient,
    containerClient,
    containerName
  );
}
