import type {
  FastifySchema,
  HTTPMethods,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
  RouteHandlerMethod,
  onRequestHookHandler,
  preHandlerHookHandler,
} from "fastify";
import type { SystemRole } from "@repo/database/enums";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { FastifyZodInstance } from "@/types/fastify.js";

import type { IdExtractor, RouteAccess } from "./access.js";
import { tagHook } from "./hookTags.js";

/**
 * Default extractor used when an `access` spec omits its own `extractor`.
 * Reads `request.params.id`, which matches the overwhelming majority of routes.
 */
const defaultIdExtractor: IdExtractor = (request) =>
  (request.params as { id?: string } | undefined)?.id;

/**
 * Route definition accepted by `defineRoute`. Mirrors the fields of Fastify's
 * `RouteOptions` that the caller is responsible for (method, path, schema,
 * handler), and replaces the manual hook/config plumbing with a single declarative
 * `access` field. `registerRoutes` translates `access` into the right
 * `onRequest`/`preHandler`/`config` triple at registration time.
 */
export interface RouteDefinition<
  TGeneric extends RouteGenericInterface = RouteGenericInterface,
> {
  method: HTTPMethods;
  path: string;
  schema: FastifySchema;
  access: RouteAccess;
  handler: RouteHandlerMethod<
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    RawReplyDefaultExpression<RawServerDefault>,
    TGeneric,
    unknown,
    FastifySchema,
    ZodTypeProvider
  >;
}

/**
 * Opaque wrapper around a `RouteDefinition`. The generic is erased at this layer
 * so a heterogeneous list of routes (different schemas, different params) can be
 * collected into `RegisteredRoute[]` without variance errors. `defineRoute`
 * type-checks the handler against the per-route generic before erasing it here.
 * The double-underscore key signals "internal — do not inspect" to readers.
 */
export interface RegisteredRoute {
  readonly __route: RouteDefinition;
}

/**
 * Wrap a route definition for later registration. This is the canonical way to
 * declare a route in this codebase — see `docs/security/route-access-modes.md`
 * for the full author guide.
 */
export function defineRoute<TGeneric extends RouteGenericInterface>(
  def: RouteDefinition<TGeneric>
): RegisteredRoute {
  // Erase the route's generic when wrapping. The handler was type-checked
  // against `def`'s narrow generic by the caller; once stored, the generic is
  // irrelevant — Fastify validates request shape from the schema at runtime.
  return { __route: def as unknown as RouteDefinition };
}

export interface RegisterRoutesOptions {
  /**
   * Applied to every `private` route in the list whose `access.systemRoles` is
   * omitted. Mirrors the group-level `requireRoles` hook that the old shape
   * registered via `fastify.addHook("preHandler", ...)`.
   */
  defaultSystemRoles?: SystemRole[];
}

interface BuiltHooks {
  config: { allowPublicAccess?: boolean; allowAnonymousAccess?: boolean };
  onRequest: onRequestHookHandler[];
  preHandler: preHandlerHookHandler[];
}

/**
 * Translates a (possibly defaulted) `RouteAccess` into the `onRequest`,
 * `preHandler`, and `config` triple Fastify expects. Exported for use by the
 * route-security validator's tests and for any code that needs to inspect what
 * a given access spec produces.
 */
export function buildHooks(
  fastify: FastifyZodInstance,
  access: RouteAccess
): BuiltHooks {
  // `fastify.requireAuth` is a single global decorator instance shared across
  // every route. Tagging it once is benign and idempotent.
  const taggedRequireAuth = tagHook(fastify.requireAuth, "requireAuth");

  if (access.mode === "public") {
    // `requireAuth` is still added: the auth plugin reads `allowPublicAccess`
    // and skips the 401 for missing credentials, but it DOES still attempt
    // authentication and populates `request.authUser` (and `currentUser`) when
    // a Bearer token is present. This preserves identity capture for handlers
    // that opportunistically read the caller (e.g. setting `createdById`).
    return {
      config: { allowPublicAccess: true },
      onRequest: [taggedRequireAuth],
      preHandler: [],
    };
  }

  if (access.mode === "anonymous") {
    const extractor = access.carbonInventory.extractor ?? defaultIdExtractor;
    const inventoryHook = tagHook(
      fastify.requireCarbonInventoryAccess(extractor, {
        requiredOrganizationRoles:
          access.carbonInventory.requiredOrganizationRoles,
        canAdminsBypass: access.carbonInventory.canAdminsBypass,
      }),
      "requireCarbonInventoryAccess"
    ) as preHandlerHookHandler;
    return {
      config: { allowAnonymousAccess: true },
      onRequest: [taggedRequireAuth],
      preHandler: [inventoryHook],
    };
  }

  // private mode below.
  const onRequest: onRequestHookHandler[] = [taggedRequireAuth];
  const preHandler: preHandlerHookHandler[] = [];

  // Decorator return types are async (`Promise<void>`) and use narrower request
  // generics than `preHandlerHookHandler`. We cast to the generic shape — Fastify
  // accepts async preHandlers at runtime, and the underlying decorators enforce
  // their own request shape from the route's schema.
  if (access.systemRoles && access.systemRoles.kind === "roles") {
    preHandler.push(
      tagHook(
        fastify.requireRoles(access.systemRoles.roles),
        "requireRoles"
      ) as preHandlerHookHandler
    );
  }

  if (access.domain) {
    const domains = Array.isArray(access.domain)
      ? access.domain
      : [access.domain];
    for (const domain of domains) {
      switch (domain.kind) {
        case "organization": {
          const { organization } = domain;
          preHandler.push(
            tagHook(
              fastify.requireOrganizationRole(
                organization.extractor ?? defaultIdExtractor,
                {
                  allowedRoles: organization.allowedRoles,
                  canAdminsBypass: organization.canAdminsBypass,
                }
              ),
              "requireOrganizationRole"
            ) as preHandlerHookHandler
          );
          break;
        }
        case "carbonInventory": {
          const { carbonInventory } = domain;
          preHandler.push(
            tagHook(
              fastify.requireCarbonInventoryAccess(
                carbonInventory.extractor ?? defaultIdExtractor,
                {
                  requiredOrganizationRoles:
                    carbonInventory.requiredOrganizationRoles,
                  canAdminsBypass: carbonInventory.canAdminsBypass,
                }
              ),
              "requireCarbonInventoryAccess"
            ) as preHandlerHookHandler
          );
          break;
        }
        case "reductionProject": {
          const { reductionProject } = domain;
          preHandler.push(
            tagHook(
              fastify.requireReductionProjectAccess({
                requiredOrganizationRoles:
                  reductionProject.requiredOrganizationRoles,
                canAdminsBypass: reductionProject.canAdminsBypass,
              }),
              "requireReductionProjectAccess"
            ) as preHandlerHookHandler
          );
          break;
        }
      }
    }
  }

  return { config: {}, onRequest, preHandler };
}

/**
 * Resolves `defaultSystemRoles` into the route's `access.systemRoles` field
 * when the route hasn't set its own. Routes that explicitly set `systemRoles`
 * (including `{ kind: "any" }`) are left untouched; public/anonymous routes
 * ignore the default entirely.
 */
function applyDefaults(
  access: RouteAccess,
  options: RegisterRoutesOptions
): RouteAccess {
  if (access.mode !== "private") return access;
  if (access.systemRoles !== undefined) return access;
  if (!options.defaultSystemRoles || options.defaultSystemRoles.length === 0) {
    return access;
  }
  return {
    ...access,
    systemRoles: { kind: "roles", roles: options.defaultSystemRoles },
  };
}

/**
 * Registers a list of `defineRoute`-wrapped routes on a Fastify instance.
 * Pass `defaultSystemRoles` to set a group-level system-role baseline that
 * `private` routes inherit when they don't specify their own.
 */
export function registerRoutes(
  fastify: FastifyZodInstance,
  routes: ReadonlyArray<RegisteredRoute>,
  options: RegisterRoutesOptions = {}
): void {
  for (const { __route: def } of routes) {
    const access = applyDefaults(def.access, options);
    const { onRequest, preHandler, config } = buildHooks(fastify, access);
    fastify.route({
      method: def.method,
      url: def.path,
      schema: def.schema,
      config,
      onRequest: onRequest.length > 0 ? onRequest : undefined,
      preHandler: preHandler.length > 0 ? preHandler : undefined,
      handler: def.handler,
    });
  }
}
