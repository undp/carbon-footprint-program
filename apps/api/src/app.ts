import fp from "fastify-plugin";
import prismaPlugin from "./plugins/external/prisma.js";
import { registerRoutes } from "./router.js";

export default fp(async (fastify) => {
  // Registrar plugins
  await fastify.register(prismaPlugin);

  // Registrar rutas
  await fastify.register(registerRoutes);
});
