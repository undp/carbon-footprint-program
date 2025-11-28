import path from "node:path";

import autoload from "@fastify/autoload";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
  const baseDir = import.meta.dirname;

  await fastify.register(autoload, {
    dir: path.join(baseDir, "plugins/external"),
  });

  await fastify.register(autoload, {
    dir: path.join(baseDir, "plugins/app"),
  });

  await fastify.register(autoload, {
    dir: path.join(baseDir, "routes"),
    autoHooks: true,
    cascadeHooks: true,
  });
});
