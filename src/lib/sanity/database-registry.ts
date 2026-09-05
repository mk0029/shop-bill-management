/**
 * Database Registry — Central role-based registry for all Sanity databases.
 *
 * This is the SINGLE source of truth for database configuration.
 * All routing, client creation, and health checks resolve through here.
 *
 * MULTIPLE DBs PER ROLE:
 *   Multiple databases can share the same role. Use a suffix to differentiate:
 *
 *   SANITY_DB_INVENTORY_PROJECT_ID=abc123           → key: "inventory"
 *   SANITY_DB_INVENTORY_EU_PROJECT_ID=def456        → key: "inventory-eu"
 *   SANITY_DB_INVENTORY_BACKUP_PROJECT_ID=ghi789    → key: "inventory-backup"
 *
 * VIEW PRIORITY:
 *   `viewPriority` controls first-load speed. Lower = faster.
 *   The aggregation engine fetches from viewPriority=1 first,
 *   then loads others in the background.
 *
 *   SANITY_DB_INVENTORY_VIEW_PRIORITY=1             → Fastest first load
 *   SANITY_DB_INVENTORY_EU_VIEW_PRIORITY=2          → Loads after primary
 */

import type { SanityDatabaseConfig, DatabaseRole } from "./types";

// ─── Static Database Definitions ───────────────────────────────

const STATIC_DATABASES: SanityDatabaseConfig[] = [
  {
    key: "primary",
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "idji8ni7",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "live-shop",
    role: "primary",
    purpose: ["general", "read", "users", "brands", "categories", "products"],
    enabled: true,
    readable: true,
    writable: true,
    priority: 1,
    viewPriority: 1,
    label: "Primary — General Data",
    apiVersion: "2024-01-01",
    useCdn: false,
  },
];

/**
 * Well-known role names for documentation and validation.
 */
export const KNOWN_ROLES: DatabaseRole[] = [
  "primary",
  "inventory",
  "billing",
  "public",
  "archive",
  "analytics",
  "customers",
  "documents",
  "logs",
  "overflow",
];

export const DEFAULT_API_VERSION = "2024-01-01";
export const DEFAULT_DATABASE_KEY = "primary";

// ─── Environment Discovery ─────────────────────────────────────

/**
 * Scans environment variables for SANITY_DB_<ROLE>[_<SUFFIX>]_* patterns
 * and builds database configurations.
 *
 * Supports multiple DBs per role:
 *   SANITY_DB_INVENTORY_PROJECT_ID=abc          → key: "inventory"
 *   SANITY_DB_INVENTORY_EU_PROJECT_ID=def       → key: "inventory-eu"
 *   SANITY_DB_INVENTORY_US_PROJECT_ID=ghi       → key: "inventory-us"
 */
function discoverDatabasesFromEnv(): SanityDatabaseConfig[] {
  if (typeof process === "undefined") return [];

  const discovered: SanityDatabaseConfig[] = [];
  const knownRoles = [
    "primary", "inventory", "billing", "public", "archive",
    "analytics", "customers", "documents", "logs", "overflow",
  ];

  // Scan all env vars for SANITY_DB_ prefix
  const envKeys = Object.keys(process.env);
  const dbPrefix = "SANITY_DB_";

  // Collect all unique role-suffix combinations
  const roleSuffixes = new Map<string, string[]>(); // role → suffixes[]

  for (const key of envKeys) {
    if (!key.startsWith(dbPrefix) || !key.endsWith("_PROJECT_ID")) continue;

    // Extract the middle part: SANITY_DB_{ROLE}_{SUFFIX}_PROJECT_ID
    const middle = key.slice(dbPrefix.length, -"_PROJECT_ID".length);

    // Try to match against known roles
    let matchedRole: string | null = null;
    let suffix = "";

    for (const role of knownRoles) {
      const roleUpper = role.toUpperCase();
      if (middle === roleUpper) {
        matchedRole = role;
        suffix = "";
        break;
      }
      if (middle.startsWith(roleUpper + "_")) {
        matchedRole = role;
        suffix = middle.slice(roleUpper.length + 1).toLowerCase();
        break;
      }
    }

    // If no known role matched, treat the whole middle as role+suffix
    if (!matchedRole) {
      const parts = middle.split("_");
      matchedRole = parts[0].toLowerCase();
      suffix = parts.slice(1).join("_").toLowerCase();
    }

    if (!matchedRole) continue;

    const existing = roleSuffixes.get(matchedRole) || [];
    if (!existing.includes(suffix)) {
      existing.push(suffix);
      roleSuffixes.set(matchedRole, existing);
    }
  }

  // Build configs for each role+suffix combination
  for (const [role, suffixes] of roleSuffixes) {
    for (const suffix of suffixes) {
      const prefix = suffix
        ? `SANITY_DB_${role.toUpperCase()}_${suffix.toUpperCase()}`
        : `SANITY_DB_${role.toUpperCase()}`;

      const projectId = process.env[`${prefix}_PROJECT_ID`];
      if (!projectId) continue;

      const purposeStr = process.env[`${prefix}_PURPOSE`] || "";
      const purposes = purposeStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const key = suffix ? `${role}-${suffix}` : role;

      discovered.push({
        key,
        projectId,
        dataset: process.env[`${prefix}_DATASET`] || "production",
        role,
        purpose: purposes.length > 0 ? purposes : [role],
        enabled: process.env[`${prefix}_ENABLED`] !== "false",
        readable: process.env[`${prefix}_READABLE`] !== "false",
        writable: process.env[`${prefix}_WRITABLE`] !== "false",
        priority: Number(process.env[`${prefix}_PRIORITY`]) || getDefaultPriority(role),
        viewPriority: Number(process.env[`${prefix}_VIEW_PRIORITY`]) || getDefaultViewPriority(role),
        label: process.env[`${prefix}_LABEL`] || capitalizeFirst(key),
        maxDocuments: process.env[`${prefix}_MAX_DOCS`]
          ? Number(process.env[`${prefix}_MAX_DOCS`])
          : undefined,
        safetyThreshold: process.env[`${prefix}_SAFETY`]
          ? Number(process.env[`${prefix}_SAFETY`])
          : undefined,
        apiVersion: process.env[`${prefix}_API_VERSION`] || DEFAULT_API_VERSION,
        useCdn: process.env[`${prefix}_CDN`] === "true",
        region: process.env[`${prefix}_REGION`] || undefined,
      });
    }
  }

  // Backward compatibility: SANITY_PROJECT_<N>_* env vars
  const maxSlots = 20;
  for (let i = 2; i <= maxSlots; i++) {
    const id = process.env[`SANITY_PROJECT_${i}_ID`];
    if (!id) continue;
    if (discovered.some((d) => d.projectId === id)) continue;

    discovered.push({
      key: `project-${i}`,
      projectId: id,
      dataset: process.env[`SANITY_PROJECT_${i}_DATASET`] || "production",
      role: "primary",
      purpose: ["general"],
      enabled: process.env[`SANITY_PROJECT_${i}_ENABLED`] !== "false",
      readable: true,
      writable: true,
      priority: Number(process.env[`SANITY_PROJECT_${i}_PRIORITY`]) || i,
      viewPriority: Number(process.env[`SANITY_PROJECT_${i}_VIEW_PRIORITY`]) || i + 10,
      label: process.env[`SANITY_PROJECT_${i}_LABEL`] || `Project ${i}`,
      maxDocuments: process.env[`SANITY_PROJECT_${i}_CAPACITY`]
        ? Number(process.env[`SANITY_PROJECT_${i}_CAPACITY`])
        : undefined,
      apiVersion: process.env[`SANITY_PROJECT_${i}_API_VERSION`] || DEFAULT_API_VERSION,
      useCdn: process.env[`SANITY_PROJECT_${i}_CDN`] === "true",
    });
  }

  return discovered;
}

function getDefaultPriority(role: DatabaseRole): number {
  switch (role) {
    case "primary": return 1;
    case "inventory": return 2;
    case "billing": return 3;
    case "public": return 4;
    default: return 10;
  }
}

function getDefaultViewPriority(role: DatabaseRole): number {
  switch (role) {
    case "primary": return 1;
    case "inventory": return 2;
    case "billing": return 3;
    case "public": return 4;
    default: return 10;
  }
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Registry Core ─────────────────────────────────────────────

function buildDatabaseList(): SanityDatabaseConfig[] {
  const envDbs = discoverDatabasesFromEnv();
  const map = new Map<string, SanityDatabaseConfig>();

  for (const db of STATIC_DATABASES) {
    map.set(db.key, db);
  }

  for (const db of envDbs) {
    map.set(db.key, db);
  }

  return Array.from(map.values()).sort((a, b) => a.priority - b.priority);
}

let _databaseList: SanityDatabaseConfig[] | null = null;

export function getDatabaseList(): SanityDatabaseConfig[] {
  if (!_databaseList) {
    _databaseList = buildDatabaseList();
  }
  return _databaseList;
}

export function refreshDatabaseList(): SanityDatabaseConfig[] {
  _databaseList = null;
  return getDatabaseList();
}

// ─── Single Database Queries ───────────────────────────────────

export function getDatabase(key: string): SanityDatabaseConfig | undefined {
  return getDatabaseList().find((db) => db.key === key);
}

export function isDatabaseEnabled(key: string): boolean {
  const db = getDatabase(key);
  return !!db && db.enabled;
}

export function getDatabaseCount(): number {
  return getDatabaseList().length;
}

// ─── Multi-DB Per Role Queries ─────────────────────────────────
// These return arrays because multiple DBs can share a role.

/**
 * Get ALL databases with a specific role (may return multiple).
 * Sorted by priority.
 */
export function getDatabasesByRole(role: DatabaseRole): SanityDatabaseConfig[] {
  return getDatabaseList().filter((db) => db.role === role && db.enabled);
}

/**
 * Get all databases that serve a specific purpose.
 * Sorted by priority.
 */
export function getDatabasesForPurpose(purpose: string): SanityDatabaseConfig[] {
  return getDatabaseList().filter(
    (db) => db.enabled && db.purpose.includes(purpose)
  );
}

/**
 * Get writable databases for a specific purpose.
 * Sorted by priority.
 */
export function getWritableDatabases(purpose: string): SanityDatabaseConfig[] {
  return getDatabaseList().filter(
    (db) => db.enabled && db.writable && db.purpose.includes(purpose)
  );
}

/**
 * Get readable databases for a specific purpose.
 * Sorted by priority.
 */
export function getReadableDatabases(purpose: string): SanityDatabaseConfig[] {
  return getDatabaseList().filter(
    (db) => db.enabled && db.readable && db.purpose.includes(purpose)
  );
}

/**
 * Get databases sorted by viewPriority (for first-load optimization).
 * Lower viewPriority = loaded first.
 */
export function getDatabasesByViewPriority(purpose: string): SanityDatabaseConfig[] {
  return getDatabaseList()
    .filter((db) => db.enabled && db.readable && db.purpose.includes(purpose))
    .sort((a, b) => a.viewPriority - b.viewPriority);
}

/**
 * Get the PRIMARY view database for a purpose (lowest viewPriority).
 * This is the DB used for first paint / initial load.
 */
export function getViewDatabase(purpose: string): SanityDatabaseConfig | undefined {
  const dbs = getDatabasesByViewPriority(purpose);
  return dbs.length > 0 ? dbs[0] : undefined;
}

/**
 * Get non-view databases for background loading.
 * These are all readable DBs for the purpose EXCEPT the view DB.
 */
export function getBackgroundDatabases(purpose: string): SanityDatabaseConfig[] {
  const viewDb = getViewDatabase(purpose);
  return getDatabaseList()
    .filter((db) => db.enabled && db.readable && db.purpose.includes(purpose))
    .filter((db) => !viewDb || db.key !== viewDb.key)
    .sort((a, b) => a.viewPriority - b.viewPriority);
}

/**
 * Get all enabled databases.
 */
export function getAllEnabledDatabases(): SanityDatabaseConfig[] {
  return getDatabaseList().filter((db) => db.enabled);
}

/**
 * Get all writable databases (across all purposes).
 */
export function getAllWritableDatabases(): SanityDatabaseConfig[] {
  return getDatabaseList().filter((db) => db.enabled && db.writable);
}

/**
 * Get the Sanity token for a specific database.
 */
export function getDatabaseToken(key: string): string | undefined {
  if (typeof window !== "undefined") return undefined;

  const role = key.toUpperCase().replace("-", "_");
  const dbToken = process.env[`SANITY_DB_${role}_TOKEN`];
  if (dbToken) return dbToken;

  // Backward compat: legacy env vars for "primary"
  if (key === "primary") {
    return (
      process.env.SANITY_API_TOKEN ||
      process.env.NEXT_PUBLIC_SANITY_API_TOKEN ||
      undefined
    );
  }

  // Backward compat: SANITY_PROJECT_<N>_TOKEN for "project-N" keys
  const idx = key.replace("project-", "");
  if (idx !== key) {
    const numberedToken = process.env[`SANITY_PROJECT_${idx}_TOKEN`];
    if (numberedToken) return numberedToken;
  }

  return undefined;
}

// ─── Backward Compatibility Aliases ────────────────────────────

/** @deprecated Use getDatabase() instead */
export const getSanityProject = getDatabase;
/** @deprecated Use getAllEnabledDatabases() instead */
export const getEnabledSanityProjects = getAllEnabledDatabases;
/** @deprecated Use getDatabaseList() instead */
export const getAllSanityProjects = getDatabaseList;
/** @deprecated Use DEFAULT_DATABASE_KEY instead */
export const DEFAULT_PROJECT_KEY = DEFAULT_DATABASE_KEY;
/** @deprecated Use isDatabaseEnabled() instead */
export const isProjectEnabled = isDatabaseEnabled;
/** @deprecated Use isDatabaseEnabled() instead */
export const isProjectValid = isDatabaseEnabled;
/** @deprecated Use getDatabaseList() instead */
export const getProjectList = getDatabaseList;
/** @deprecated Use refreshDatabaseList() instead */
export const refreshProjectList = refreshDatabaseList;
/** @deprecated Use getDatabaseToken() instead */
export const getProjectToken = getDatabaseToken;
