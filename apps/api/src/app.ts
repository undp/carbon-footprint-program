import path from "node:path";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import autoload from "@fastify/autoload";
import { IS_PROD, LOG_LEVEL } from "@/config/environment.js";

function getLoggerOptions() {
  const baseOptions = {
    level: LOG_LEVEL,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
      ],
      remove: true,
    },
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

  // Only add transport in development
  if (!IS_PROD) {
    return {
      ...baseOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    };
  }

  return baseOptions;
}

export async function createApp(
  withPrisma: boolean = true,
  opts?: { skipUnderPressure?: boolean }
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: getLoggerOptions(),
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  // set up Zod validators and serializers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const baseDir = import.meta.dirname;

  // Tests can opt out of @fastify/under-pressure via skipUnderPressure;
  // it otherwise returns 503 under serialized test load. Prod loads it normally.
  await app.register(autoload, {
    dir: path.join(baseDir, "plugins/external"),
    ignoreFilter: opts?.skipUnderPressure
      ? (filePath) => filePath.includes("under-pressure")
      : undefined,
  });

  // Load app plugins (prisma, error handler, etc.)
  await app.register(autoload, {
    dir: path.join(baseDir, "plugins/app"),
    ignoreFilter: withPrisma ? undefined : (path) => path.includes("prisma"),
  });

  await app.register(autoload, {
    dir: path.join(baseDir, "routes"),
    autoHooks: true,
    cascadeHooks: true,
  });

  return app;
}
