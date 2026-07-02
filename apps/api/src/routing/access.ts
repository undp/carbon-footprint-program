import type { FastifyRequest } from "fastify";
import type { OrganizationRole, SystemRole } from "@repo/database/enums";

/**
 * Pulls a resource ID out of the request. When omitted on an access spec, the
 * route receives the default `:id` route-param extractor (see `defaultIdExtractor`
 * in `defineRoute.ts`). Custom extractors are still supported — pass one
 * explicitly when the resource ID lives anywhere other than `request.params.id`.
 */
// Permissive request shape so extractors that read from `request.params.X` (with
// X chosen per-route) remain assignable. The Fastify type-provider validates the
// actual params at runtime via the route schema; the extractor is just sugar.
export type IdExtractor = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: FastifyRequest<any>
) => string | null | undefined;

export type SystemRolesRequirement =
  { kind: "any" } | { kind: "roles"; roles: SystemRole[] };

/**
 * Per-domain access options. All fields are optional; omitting a field selects
 * its default behavior:
 * - `extractor` → reads `request.params.id`.
 * - `requiredOrganizationRoles` → any active organization role suffices.
 * - `canAdminsBypass` → `false`.
 */
export type OrganizationAccess = {
  extractor?: IdExtractor;
  requiredOrganizationRoles?: OrganizationRole[];
  canAdminsBypass?: boolean;
};

export type CarbonInventoryAccess = {
  extractor?: IdExtractor;
  requiredOrganizationRoles?: OrganizationRole[];
  canAdminsBypass?: boolean;
};

export type ReductionProjectAccess = {
  requiredOrganizationRoles?: OrganizationRole[];
  canAdminsBypass?: boolean;
};

export type DomainAccess =
  | { kind: "organization"; options?: OrganizationAccess }
  | { kind: "carbonInventory"; options?: CarbonInventoryAccess }
  | { kind: "reductionProject"; options?: ReductionProjectAccess };

/**
 * Declarative security spec for a single route. The discriminated `mode` field
 * encodes the access mode (private / public / anonymous) and constrains which
 * additional fields are valid. See `docs/security/route-access-modes.md` for the
 * runtime behavior of each mode.
 *
 * `domain` accepts either a single `DomainAccess` or an array, for the rare
 * case where a route operates on multiple resources at once (e.g. a path that
 * carries both `:organizationId` and `:carbonInventoryId` and needs both
 * checks). When multiple domains are specified, every preHandler runs and the
 * caller must satisfy all of them.
 */
export type RouteAccess =
  | { mode: "public" }
  | { mode: "anonymous"; options?: CarbonInventoryAccess }
  | {
      mode: "private";
      systemRoles?: SystemRolesRequirement;
      domain?: DomainAccess | DomainAccess[];
    };
