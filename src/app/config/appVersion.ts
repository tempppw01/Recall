/**
 * App versioning (single source of truth)
 *
 * Version value is injected at build time via next.config.js -> env.NEXT_PUBLIC_APP_VERSION.
 * This module centralizes the runtime access + localStorage key.
 */

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

// Used for localStorage migration / cache marker
export const APP_VERSION_STORAGE_KEY = 'recall_app_version';
