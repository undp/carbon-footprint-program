import fp from "fastify-plugin";
import { buildStorageConfig } from "@/config/environment.js";
import { createStorageAdapter, StorageProvider } from "@repo/storage";

export default fp(
  async (fastify) => {
    if (fastify.hasDecorator("storage")) return;

    const config = buildStorageConfig();
    const { provider } = config;

    // Which credential mode is active is the first thing an operator reaches
    // for when S3 auth misbehaves, and it is not otherwise visible anywhere.
    if (config.provider === StorageProvider.MINIO) {
      fastify.log.info(
        config.minio.credentials
          ? "S3 credentials: static keys (MINIO_ACCESS_KEY / MINIO_SECRET_KEY)"
          : "S3 credentials: AWS SDK default chain (keyless — task role, instance profile, AWS_* env, SSO)"
      );
    }

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
