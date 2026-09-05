/**
 * Project Registry API — Backward-compatible wrapper around database-registry.
 *
 * @deprecated Use database-registry.ts instead.
 * This file exists only so that existing imports from "./project-registry"
 * continue to compile without changes.
 */

import {
  getDatabaseList,
  getDatabase,
  getAllEnabledDatabases,
  DEFAULT_DATABASE_KEY,
  isDatabaseEnabled,
} from "./database-registry";
import type { SanityDatabaseConfig } from "./types";

export function getEnabledSanityProjects(): SanityDatabaseConfig[] {
  return getAllEnabledDatabases();
}

export function getSanityProject(
  projectKey: string
): SanityDatabaseConfig | undefined {
  return getDatabase(projectKey);
}

export function getAllSanityProjects(): SanityDatabaseConfig[] {
  return getDatabaseList();
}

export function getDefaultProjectKey(): string {
  return DEFAULT_DATABASE_KEY;
}

export function isProjectEnabled(projectKey: string): boolean {
  return isDatabaseEnabled(projectKey);
}

export function getProjectId(projectKey: string): string | undefined {
  const project = getDatabase(projectKey);
  return project?.projectId;
}

export function getProjectDataset(projectKey: string): string | undefined {
  const project = getDatabase(projectKey);
  return project?.dataset;
}

export function findProjectBySanityId(
  sanityProjectId: string
): SanityDatabaseConfig | undefined {
  return getDatabaseList().find((p) => p.projectId === sanityProjectId);
}

export function getProjectCount(): number {
  return getDatabaseList().length;
}

export function getPrimaryProjectKey(): string {
  const enabled = getAllEnabledDatabases();
  return enabled.length > 0 ? enabled[0].key : DEFAULT_DATABASE_KEY;
}
