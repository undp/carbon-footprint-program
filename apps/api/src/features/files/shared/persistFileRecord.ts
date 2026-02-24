import { RestError, type ContainerClient } from "@azure/storage-blob";
import { FileNotFoundError } from "./errors.js";

export interface PersistFileRecordParams {
  uuid: string;
  blobPath: string;
  originalName: string;
  userId: string;
}

export async function checkFileRecordExists(
  blobStorage: ContainerClient,
  blobPath: string,
  uuid: string
): Promise<{ sizeBytes: number; mimeType: string }> {
  const blobClient = blobStorage.getBlobClient(blobPath);

  try {
    const props = await blobClient.getProperties();
    return {
      sizeBytes: props.contentLength!,
      mimeType: props.contentType ?? "application/octet-stream",
    };
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) {
      throw new FileNotFoundError(uuid);
    }
    throw err;
  }
}
