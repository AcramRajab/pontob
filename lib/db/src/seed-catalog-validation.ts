/**
 * Pre-seed catalog validation — pure, synchronous, no DB access.
 *
 * Call this before any database writes so that misconfigured catalog data is
 * caught immediately with a clear error message rather than silently skipping
 * rows or reaching the database.
 */

import type { InitiativeTuple, KeyProcessConfig } from "./seed-catalog-config.js";

export interface CatalogGroup {
  dimensionName: string;
  keyProcesses: KeyProcessConfig[];
  initiatives: InitiativeTuple[];
}

/**
 * Validates a set of catalog groups (dimension → key processes → initiatives).
 *
 * Throws with a detailed message if any of the following are violated:
 * - An initiative's `kpIndex` is out of range for its key-process array
 * - An initiative has a blank name, KRI, or KPI
 * - Two initiatives in the same key process share a name
 */
export function validateCatalogSeedData(groups: CatalogGroup[]): void {
  const errors: string[] = [];

  for (const group of groups) {
    const { dimensionName, keyProcesses, initiatives } = group;
    const kpCount = keyProcesses.length;

    const seenByKP = new Map<number, Set<string>>();

    for (const [kpIdx, name, kri, kpi] of initiatives) {
      const location = `[${dimensionName}] initiative "${name}"`;

      if (kpIdx < 0 || kpIdx >= kpCount) {
        errors.push(
          `${location}: kpIndex ${kpIdx} is out of range (dimension has ${kpCount} key process${kpCount === 1 ? "" : "es"}, valid indices are 0–${kpCount - 1})`,
        );
        continue;
      }

      if (name.trim() === "") {
        errors.push(`[${dimensionName}] initiative with kpIndex ${kpIdx}: name must not be blank`);
        continue;
      }

      if (kri.trim() === "") {
        errors.push(`${location}: KRI must not be blank`);
      }

      if (kpi.trim() === "") {
        errors.push(`${location}: KPI must not be blank`);
      }

      if (!seenByKP.has(kpIdx)) seenByKP.set(kpIdx, new Set());
      const bucket = seenByKP.get(kpIdx)!;
      if (bucket.has(name)) {
        const kpName = keyProcesses[kpIdx].name;
        errors.push(
          `${location}: duplicate name within key process "${kpName}" (kpIndex ${kpIdx})`,
        );
      } else {
        bucket.add(name);
      }
    }
  }

  if (errors.length === 0) return;

  throw new Error(
    `Catalog seed validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:\n` +
      errors.map((e) => `  - ${e}`).join("\n") +
      "\n\nFix these issues in seed-catalog-config.ts before running the seed.",
  );
}
