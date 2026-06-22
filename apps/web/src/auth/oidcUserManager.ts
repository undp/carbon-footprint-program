import { UserManager } from "oidc-client-ts";
import { oidcSettings } from "@/config/oidcConfig";

/**
 * Singleton OIDC `UserManager` — the single source of truth for the session
 * OUTSIDE React. The route guard (`requireRole`) and the `ky` HTTP client run
 * before/around React and read the session from here; `react-oidc-context` is
 * mounted against this SAME instance (see `routes/__root.tsx`), so React and
 * non-React consumers never diverge.
 */
export const oidcUserManager = new UserManager(oidcSettings);
