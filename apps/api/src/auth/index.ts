/**
 * @fileoverview Authentication Module
 *
 * Exports all authentication-related types, providers, and services.
 */

export * from "./types.js";
export * from "./AuthProvider.js";
export * from "./AuthService.js";
export * from "./providers/index.js";
export { default as authenticationPlugin } from "../plugins/app/authenticationPlugin.js";
