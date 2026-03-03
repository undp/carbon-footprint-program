import fp from "fastify-plugin";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/config/environment.js";

export default fp(
  (fastify, _opts, done) => {
    if (fastify.hasDecorator("blobStorage")) {
      done();
      return;
    }

    if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_CONTAINER_NAME) {
      fastify.log.warn(
        "AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONTAINER_NAME is not set — blob storage is disabled. File upload/download will not work."
      );
      fastify.decorate("blobServiceClient", undefined);
      fastify.decorate("blobStorage", undefined);
      fastify.decorate("storageContainerName", undefined);
      done();
      return;
    }

    const blobServiceClient = new BlobServiceClient(
      `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );

    const containerClient: ContainerClient =
      blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);

    fastify.decorate("blobServiceClient", blobServiceClient);
    fastify.decorate("blobStorage", containerClient);

    // Verify container in background — don't block startup
    containerClient.exists().then(
      (exists) => {
        if (!exists) {
          fastify.log.warn(
            `Blob container "${AZURE_STORAGE_CONTAINER_NAME}" does not exist in storage account "${AZURE_STORAGE_ACCOUNT_NAME}". File uploads will fail until the container is created.`
          );
        } else {
          fastify.log.info(
            `Blob storage connected: ${AZURE_STORAGE_ACCOUNT_NAME}/${AZURE_STORAGE_CONTAINER_NAME}`
          );
        }
      },
      (error) => {
        fastify.log.warn(
          { error },
          "Failed to verify blob container existence — storage may not be accessible"
        );
      }
    );

    done();
  },
  { name: "blob-storage-plugin" }
);
