/**
 * @fileoverview Authentication Module
 *
 * Exports all authentication-related types, providers, and services.
 */

import { AUTH_PROVIDER } from "../config/environment.js";
import { AuthService } from "./AuthService.js";

export * from "./types.js";
export * from "./AuthProvider.js";
export * from "./AuthService.js";
export * from "./providers/index.js";
export { default as authenticationPlugin } from "../plugins/app/authenticationPlugin.js";

// Instantiate the auth service
export const authService = new AuthService(AUTH_PROVIDER);
