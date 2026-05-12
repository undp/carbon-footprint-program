import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import { FastifyDynamicSwaggerOptions } from "@fastify/swagger";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export const autoConfig: FastifyDynamicSwaggerOptions = {
  mode: "dynamic",
  openapi: {
    info: {
      title: "Huella Latam API",
      description: "API server for Huella Latam",
      version: "0.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Bearer JWT issued by the configured identity provider. Required for all protected endpoints. Pass it as `Authorization: Bearer <token>`.",
        },
        inventoryUuid: {
          type: "apiKey",
          in: "header",
          name: "x-carbon-inventory-uuid",
          description:
            "Carbon inventory UUID used to authorize anonymous access to a specific inventory. Accepted only on endpoints that explicitly allow anonymous access; grants scope limited to the inventory identified by the UUID.",
        },
      },
    },
  },
  hideUntagged: true,
  transform: ({ schema, url, route, ...rest }) => {
    const config = route.config;
    let security: Array<Record<string, string[]>>;
    if (config?.public === true) {
      security = [];
    } else if (config?.allowAnonymousAccess === true) {
      security = [{ bearerAuth: [] }, { inventoryUuid: [] }];
    } else {
      security = [{ bearerAuth: [] }];
    }
    const schemaWithSecurity = { ...schema, security };
    return jsonSchemaTransform({
      schema: schemaWithSecurity,
      url,
      route,
      ...rest,
    });
  },
};

export default fp<FastifyDynamicSwaggerOptions>(
  async function (fastify, opts) {
    await fastify.register(fastifySwagger, opts);
  },
  { name: "swagger-plugin" }
);
