/**
 * @fileoverview Authentication Service (Facade)
 *
 * Implements the Facade pattern to provide a unified interface for authentication.
 * Supports multiple identity providers and can be configured to use different
 * strategies based on environment.
 *
 * ## Design Pattern: Facade
 *
 * The AuthService acts as a facade that:
 * 1. Hides the complexity of multiple auth providers
 * 2. Provides a simple, unified API for authentication
 * 3. Allows configuration of different providers via environment
 *
 * ## Usage
 *
 * ```typescript
 * // Create service with specific provider
 * const authService = new AuthService("jwks");
 *
 * // Authenticate a request
 * const result = await authService.authenticate(request);
 * if (result.user) {
 *   console.log(result.user.email);
 * }
 * ```
 *
 * @see AuthProvider - Interface for implementing new providers
 * @see JwksAuthProvider - JWT/JWKS-based authentication
 */

import type { FastifyRequest } from "fastify";
import type { AuthProvider, AuthResult } from "./AuthProvider.js";
import type { AuthProviderType } from "./types.js";
import { JwksAuthProvider } from "./providers/JwksAuthProvider.js";
import { NoneProvider } from "./providers/NoneProvider.js";
import { ForcedUserProvider } from "./providers/ForcedUserProvider.js";

/**
 * Authentication Service Facade
 *
 * Provides a unified interface for authentication across multiple providers.
 */
export class AuthService {
  private readonly provider_type: AuthProviderType;
  private readonly provider: AuthProvider;

  constructor(provider_type: AuthProviderType) {
    this.provider_type = provider_type;

    if (this.provider_type === "jwks") {
      this.provider = new JwksAuthProvider();
    } else if (this.provider_type === "forced-user") {
      this.provider = new ForcedUserProvider();
    } else {
      this.provider = new NoneProvider();
    }
  }

  /**
   * Get the configured provider type.
   */
  getConfiguredProvider(): AuthProviderType {
    return this.provider_type;
  }

  /**
   * Authenticate a request using the configured provider. Every AUTH_PROVIDER
   * value resolves a provider, so there is no "disabled" short-circuit: with
   * "none" the NoneProvider resolves no user, which leaves private routes to
   * 401 and public routes to render.
   */
  async authenticate(request: FastifyRequest): Promise<AuthResult> {
    return this.provider.authenticate(request);
  }
}
