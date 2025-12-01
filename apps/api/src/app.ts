import path from "node:path";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import type { FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import autoload from "@fastify/autoload";
import { IS_PROD, LOG_LEVEL } from "@/config/environment.js";

function getLoggerOptions() {
  return {
    level: LOG_LEVEL,
    transport: !IS_PROD
      ? {
          // Only for local dev
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
      ],
      remove: true,
    },
    // Make request tracing nicer
    genReqId: () => randomUUID(),
    serializers: {
      req(request: FastifyRequest) {
        return {
          id: request.id,
          method: request.method,
          url: request.url,
          params: request.params,
        };
      },
    },
  };
}

export async function createApp() {
  const app = Fastify({
    logger: getLoggerOptions(),
  }).withTypeProvider<ZodTypeProvider>();

  // Configurar los compiladores de validación y serialización para Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const baseDir = import.meta.dirname;

  await app.register(autoload, {
    dir: path.join(baseDir, "plugins/external"),
  });

  await app.register(autoload, {
    dir: path.join(baseDir, "plugins/app"),
  });

  await app.register(autoload, {
    dir: path.join(baseDir, "routes"),
    autoHooks: true,
    cascadeHooks: true,
  });

  return app;
}
