import { pool } from "./index.js";

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'catalog_audit_logs'
      ) AS exists`,
    );

    if (!rows[0]?.exists) {
      console.log("Table catalog_audit_logs does not exist — nothing to do.");
      return;
    }

    await client.query("DROP TABLE catalog_audit_logs");
    console.log("Dropped table catalog_audit_logs.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
