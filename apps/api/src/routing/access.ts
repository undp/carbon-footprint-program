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
  | { kind: "any" }
  | { kind: "roles"; roles: SystemRole[] };

export type OrganizationAccess = {
  extractor?: IdExtractor;
  allowedRoles: OrganizationRole[];
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
  | { kind: "organization"; organization: OrganizationAccess }
  | { kind: "carbonInventory"; carbonInventory: CarbonInventoryAccess }
  | { kind: "reductionProject"; reductionProject: ReductionProjectAccess };

/**
 * Declarative security spec for a single route. The discriminated `mode` field
 * encodes the access mode (private / public / anonymous) and constrains which
 * additional fields are valid. See `docs/security/route-access-modes.md` for the
 * runtime behavior of each mode.
 */
export type RouteAccess =
  | { mode: "public" }
  | { mode: "anonymous"; carbonInventory: CarbonInventoryAccess }
  | {
      mode: "private";
      systemRoles?: SystemRolesRequirement;
      domain?: DomainAccess;
    };
