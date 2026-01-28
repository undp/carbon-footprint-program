/**
 * @fileoverview Auth Provider Interface
 *
 * Defines the contract that all authentication providers must implement.
 * This enables the facade pattern for swappable auth strategies.
 */

import type { FastifyRequest } from "fastify";
import type { AuthUser, AuthProviderType } from "./types.js";

/**
 * Authentication result from a provider.
 */
export type AuthResult =
  | {
      /** The authenticated user */
      user: AuthUser;
      error?: never;
    }
  | {
      /** No user when authentication fails */
      user: null;
      /** Error message */
      error: string;
    };

/**
 * Interface that all authentication providers must implement.
 *
 * Each provider is responsible for:
 * 1. Extracting credentials from the request
 * 2. Validating the credentials
 * 3. Returning a normalized AuthUser object
 */
export interface AuthProvider {
  /** The type identifier for this provider */
  readonly type: AuthProviderType;

  /**
   * Authenticate a request and extract user information.
   *
   * @param request - The Fastify request object
   * @returns Authentication result with user info or error
   */
  authenticate(request: FastifyRequest): Promise<AuthResult>;
}
