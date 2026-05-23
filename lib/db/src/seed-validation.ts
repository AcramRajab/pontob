/**
 * Pre-seed validation — pure, synchronous, no DB access.
 *
 * Call this before any database writes so that misconfigurations are caught
 * immediately with a clear error message rather than silently reaching the DB.
 */

export interface UserSeedRow {
  email: string;
  active: boolean;
}

/**
 * Throws if any email in `permanentlyDeactivatedEmails` appears as
 * `active: true` in `userData`. This protects against accidentally
 * re-activating placeholder accounts that must stay deactivated forever.
 */
export function validateSeedData(
  userData: UserSeedRow[],
  permanentlyDeactivatedEmails: string[],
): void {
  const deactivatedSet = new Set(permanentlyDeactivatedEmails);

  const violations = userData.filter(
    (u) => deactivatedSet.has(u.email) && u.active,
  );

  if (violations.length === 0) return;

  const list = violations.map((u) => `  - ${u.email}`).join("\n");
  throw new Error(
    `Seed validation failed: the following permanently-deactivated accounts ` +
      `are marked active: true in userData and must never be re-activated:\n${list}\n` +
      `Set active: false for each of these entries before running the seed.`,
  );
}
