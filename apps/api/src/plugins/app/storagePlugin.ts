import fp from "fastify-plugin";
import { buildStorageConfig } from "@/config/environment.js";
import { createStorageAdapter } from "@repo/storage";

export default fp(
  async (fastify) => {
    if (fastify.hasDecorator("storage")) return;

    const config = buildStorageConfig();
    const { provider } = config;
    const storage = await createStorageAdapter(config);
    fastify.decorate("storage", storage);

    // Verify bucket/container in background — don't block startup.
    storage.healthCheck().then(
      (ok) => {
        if (ok) {
          fastify.log.info(`Object storage connected (provider=${provider})`);
        } else {
          fastify.log.warn(
            `Object storage bucket/container is not reachable (provider=${provider}). File uploads will fail until it is created.`
          );
        }
      },
      (error) => {
        fastify.log.warn(
          { error },
          `Object storage health check failed (provider=${provider})`
        );
      }
    );
  },
  { name: "storage-plugin" }
);
