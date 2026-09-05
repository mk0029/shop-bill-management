/**
 * Legacy Project Configuration — Backward-compatible wrapper.
 *
 * @deprecated Use database-registry.ts instead.
 */

import {
  getDatabaseList,
  refreshDatabaseList,
  getDatabaseToken,
  DEFAULT_DATABASE_KEY,
} from "./database-registry";

export function getProjectList() {
  return getDatabaseList();
}

export function refreshProjectList() {
  return refreshDatabaseList();
}

export function getProjectToken(key: string): string | undefined {
  return getDatabaseToken(key);
}

export const DEFAULT_PROJECT_KEY = DEFAULT_DATABASE_KEY;

export function isProjectValid(key: string): boolean {
  const { isDatabaseEnabled } = require("./database-registry");
  return isDatabaseEnabled(key);
}
