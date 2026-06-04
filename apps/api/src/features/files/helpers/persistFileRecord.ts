import type { StorageAdapter } from "@/services/storage/index.js";
import { ObjectNotFoundError } from "@/services/storage/index.js";
import { FileNotFoundError } from "../errors.js";

export interface PersistFileRecordParams {
  uuid: string;
  blobPath: string;
  originalName: string;
  userId?: string;
}

export async function checkFileRecordExists(
  storage: StorageAdapter,
  blobPath: string,
  uuid: string
): Promise<{ sizeBytes: number; mimeType: string }> {
  try {
    return await storage.headObject(blobPath);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      throw new FileNotFoundError(uuid);
    }
    throw err;
  }
}
