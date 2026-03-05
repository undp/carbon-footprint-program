import type { BlobServiceClient } from "@azure/storage-blob";
import {
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";
import { SAS_URL_EXPIRY_MINUTES } from "@/config/constants.js";

export interface SasUrlResult {
  url: string;
  expiresAt: Date;
}

export interface ReadSasOptions {
  contentType?: string;
  contentDisposition?: string;
}

/**
 * Generates a read-only SAS URL for a blob.
 * Uses User Delegation SAS (Azure AD-based, no account keys needed).
 */
export async function generateReadSasUrl(
  blobServiceClient: BlobServiceClient,
  containerName: string,
  blobPath: string,
  options?: ReadSasOptions,
  expiresInMinutes = SAS_URL_EXPIRY_MINUTES
): Promise<SasUrlResult> {
  const startsOn = new Date();
  const expiresAt = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

  const { accountName } = blobServiceClient;

  const userDelegationKey = await blobServiceClient.getUserDelegationKey(
    startsOn,
    expiresAt
  );

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn: expiresAt,
      protocol: SASProtocol.Https,
      ...(options?.contentType && { contentType: options.contentType }),
      ...(options?.contentDisposition && {
        contentDisposition: options.contentDisposition,
      }),
    },
    userDelegationKey,
    accountName
  ).toString();

  const encodedBlobPath = blobPath.split("/").map(encodeURIComponent).join("/");
  const url = `https://${accountName}.blob.core.windows.net/${containerName}/${encodedBlobPath}?${sasToken}`;

  return { url, expiresAt };
}

/**
 * Generates a write-only SAS URL for uploading a blob.
 * Uses User Delegation SAS (Azure AD-based, no account keys needed).
 */
export async function generateWriteSasUrl(
  blobServiceClient: BlobServiceClient,
  containerName: string,
  blobPath: string,
  expiresInMinutes = SAS_URL_EXPIRY_MINUTES
): Promise<SasUrlResult> {
  const startsOn = new Date();
  const expiresAt = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

  const { accountName } = blobServiceClient;

  const userDelegationKey = await blobServiceClient.getUserDelegationKey(
    startsOn,
    expiresAt
  );

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("cw"),
      startsOn,
      expiresOn: expiresAt,
      protocol: SASProtocol.Https,
    },
    userDelegationKey,
    accountName
  ).toString();

  const encodedBlobPath = blobPath.split("/").map(encodeURIComponent).join("/");
  const url = `https://${accountName}.blob.core.windows.net/${containerName}/${encodedBlobPath}?${sasToken}`;

  return { url, expiresAt };
}
