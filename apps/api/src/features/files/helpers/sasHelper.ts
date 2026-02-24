import type { BlobServiceClient } from "@azure/storage-blob";
import {
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";

interface SasUrlResult {
  url: string;
  expiresAt: Date;
}

interface ReadSasOptions {
  contentType?: string;
  contentDisposition?: string;
}

/**
 * Generates a read-only SAS URL for a blob.
 * Uses User Delegation SAS (Azure AD-based, no account keys needed).
 */
export async function generateReadSasUrl(
  blobServiceClient: BlobServiceClient,
  accountName: string,
  containerName: string,
  blobPath: string,
  expiresInMinutes = 15,
  options?: ReadSasOptions
): Promise<SasUrlResult> {
  const startsOn = new Date();
  const expiresAt = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

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

  const url = `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;

  return { url, expiresAt };
}

/**
 * Generates a write-only SAS URL for uploading a blob.
 * Uses User Delegation SAS (Azure AD-based, no account keys needed).
 */
export async function generateWriteSasUrl(
  blobServiceClient: BlobServiceClient,
  accountName: string,
  containerName: string,
  blobPath: string,
  expiresInMinutes = 15
): Promise<SasUrlResult> {
  const startsOn = new Date();
  const expiresAt = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

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

  const url = `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;

  return { url, expiresAt };
}
