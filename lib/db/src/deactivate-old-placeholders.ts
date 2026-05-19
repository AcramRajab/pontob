import { db, pool } from "./index.js";
import { inArray } from "drizzle-orm";
import { usersTable } from "./schema/index.js";

// These two emails were the original placeholder accounts from the old scripts/src/seed.ts.
// They were replaced by real production accounts (acramrajab@remax.com.br, etc.) in the
// lib/db/src/seed.ts rewrite. The other two accounts from the old seed
// (franqueado@remaxsc.com.br, responsavel@remaxsc.com.br) kept their emails and remain
// active in the new seed, so they are intentionally excluded here.
const OLD_PLACEHOLDER_EMAILS = [
  "admin@remaxsc.com.br",
  "regional@remaxsc.com.br",
];

async function main() {
  console.log("Deactivating old placeholder accounts...");

  const result = await db
    .update(usersTable)
    .set({ active: false })
    .where(inArray(usersTable.email, OLD_PLACEHOLDER_EMAILS))
    .returning({ email: usersTable.email });

  if (result.length === 0) {
    console.log("No old placeholder accounts found — nothing to do.");
  } else {
    console.log(`Deactivated ${result.length} account(s):`);
    for (const row of result) {
      console.log(`  - ${row.email}`);
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
