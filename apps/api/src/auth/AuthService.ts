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
 * const authService = new AuthService({ provider: "jwks", enabled: true });
 *
 * // Authenticate a request
 * const result = await authService.authenticate(request);
 * if (result.success) {
 *   console.log(result.user.email);
 * }
 * ```
 *
 * @see AuthProvider - Interface for implementing new providers
 * @see JwksAuthProvider - JWT/JWKS-based authentication
 * @see EasyAuthProvider - Azure App Service Easy Auth
 */

import type { FastifyRequest } from "fastify";
import type { AuthProvider, AuthResult } from "./AuthProvider.js";
import type { AuthConfig, AuthProviderType } from "./types.js";
import { JwksAuthProvider } from "./providers/JwksAuthProvider.js";
import { EasyAuthProvider } from "./providers/EasyAuthProvider.js";

/**
 * Authentication Service Facade
 *
 * Provides a unified interface for authentication across multiple providers.
 */
export class AuthService {
  private readonly providers: Map<AuthProviderType, AuthProvider>;
  private readonly config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.providers = new Map();

    // Register available providers
    this.registerProvider(new JwksAuthProvider());
    this.registerProvider(new EasyAuthProvider());
  }

  /**
   * Register an authentication provider.
   */
  registerProvider(provider: AuthProvider): void {
    this.providers.set(provider.type, provider);
  }

  /**
   * Get a specific provider by type.
   */
  getProvider(type: AuthProviderType): AuthProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Check if authentication is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the configured provider type.
   */
  getConfiguredProvider(): AuthProviderType {
    return this.config.provider;
  }

  /**
   * Authenticate a request using the configured provider.
   */
  async authenticate(request: FastifyRequest): Promise<AuthResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: "Authentication is disabled",
      };
    }

    if (this.config.provider === "none") {
      return {
        success: false,
        error: "Authentication provider is set to none",
      };
    }

    const provider = this.providers.get(this.config.provider);
    if (!provider) {
      return {
        success: false,
        error: `Unknown auth provider: ${this.config.provider}`,
      };
    }

    return provider.authenticate(request);
  }
}
