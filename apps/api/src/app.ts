import path from "node:path";
import net from "node:net";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyRequest,
} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import autoload from "@fastify/autoload";
import { IS_PROD, LOG_LEVEL, TRUST_PROXY } from "@/config/environment.js";
import { NETWORK_CONNECTION_ATTEMPT_TIMEOUT_MS } from "@/config/constants.js";

// Process-wide: without this, every outbound connection (https agents and
// fetch — e.g. the JWKS signing-key download behind token validation) fails
// with an empty AggregateError on networks where TCP connect takes longer
// than Node's 250ms default budget per address.
net.setDefaultAutoSelectFamilyAttemptTimeout(
  NETWORK_CONNECTION_ATTEMPT_TIMEOUT_MS
);

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

/**
 * Warn once at boot when proxy trust was never configured in production.
 *
 * The cost of leaving it unconfigured is silent: requests still succeed, but
 * the rate limiter keys every one of them on the proxy's address, so the limit
 * is shared across all callers instead of applied per client. Nothing surfaces
 * that at runtime.
 *
 * Gated on `undefined`, NOT on the effective `false`. A deployment that really
 * is reached directly sets `TRUST_PROXY=false` and is correct; warning at it on
 * every boot would be a permanent false positive, and a warning that is always
 * wrong for someone is one everyone learns to ignore.
 *
 * Exported so the exact condition is testable without booting the whole app —
 * the distinction between "unset" and "explicitly false" is subtle enough that
 * a reader has already mistaken one for the other.
 */
export function warnIfProxyTrustUnconfigured(
  log: Pick<FastifyBaseLogger, "warn">,
  isProd: boolean,
  trustProxy: boolean | number | string | undefined
): void {
  if (!isProd || trustProxy !== undefined) return;

  log.warn(
    "TRUST_PROXY is not configured, so request.ip is the peer address of " +
      "the TCP connection. If this API is behind a load balancer, CDN or " +
      "reverse proxy (Azure App Service, Front Door, nginx), every client " +
      "resolves to the same address and the rate limiter applies ONE shared " +
      "bucket to all of them. Set TRUST_PROXY to the proxy's IP/CIDR or a " +
      "hop count. Set it to false explicitly to record that the API really " +
      "is reached directly and silence this warning."
  );
}

export async function createApp(
  withPrisma: boolean = true,
  opts?: { skipUnderPressure?: boolean }
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: getLoggerOptions(),
    genReqId: () => randomUUID(),
    // Resolves `request.ip` from X-Forwarded-For when the deployment sits behind
    // a proxy it trusts. `undefined` means the operator never configured it, so
    // apply Fastify's own default of trusting nothing. See TRUST_PROXY in
    // config/environment.ts for why this is per-deployment rather than a
    // constant, and what it costs to get wrong in either direction.
    trustProxy: TRUST_PROXY ?? false,
  }).withTypeProvider<ZodTypeProvider>();

  warnIfProxyTrustUnconfigured(app.log, IS_PROD, TRUST_PROXY);

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
