import fp from "fastify-plugin";
import { STORAGE_PROVIDER } from "@/config/environment.js";
import { createStorageAdapter } from "@/services/storage/index.js";

export default fp(
  async (fastify) => {
    if (fastify.hasDecorator("storage")) return;

    const storage = await createStorageAdapter(STORAGE_PROVIDER);
    fastify.decorate("storage", storage);

    // Verify bucket/container in background — don't block startup.
    storage.healthCheck().then(
      (ok) => {
        if (ok) {
          fastify.log.info(
            `Object storage connected (provider=${STORAGE_PROVIDER})`
          );
        } else {
          fastify.log.warn(
            `Object storage bucket/container is not reachable (provider=${STORAGE_PROVIDER}). File uploads will fail until it is created.`
          );
        }
      },
      (error) => {
        fastify.log.warn(
          { error },
          `Object storage health check failed (provider=${STORAGE_PROVIDER})`
        );
      }
    );
  },
  { name: "storage-plugin" }
);
