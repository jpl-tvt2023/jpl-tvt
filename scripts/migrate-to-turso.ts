/**
 * Migrate local tvt-league.db to remote Turso database.
 *
 * Usage:
 *   $env:TURSO_CONNECTION_URL = "libsql://..."
 *   $env:TURSO_AUTH_TOKEN = "..."
 *   npx tsx scripts/migrate-to-turso.ts
 */

import { createClient } from "@libsql/client";

const TABLES_IN_ORDER = [
  "users",
  "groups",
  "settings",
  "audit_logs",
  "teams",
  "gameweeks",
  "players",
  "playoff_ties",
  "gameweek_chips",
  "challenger_survival_entries",
  "fixtures",
  "gameweek_captains",
  "results",
];

async function migrate() {
  const remoteUrl = process.env.TURSO_CONNECTION_URL;
  const remoteToken = process.env.TURSO_AUTH_TOKEN;

  if (!remoteUrl || !remoteToken) {
    console.error("❌ Set TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN env vars");
    process.exit(1);
  }

  // Local DB (file-based libsql)
  const local = createClient({ url: "file:./tvt-league.db" });

  // Remote Turso DB
  const remote = createClient({ url: remoteUrl, authToken: remoteToken });

  console.log("🔗 Connected to local and remote databases\n");

  let totalRows = 0;

  for (const table of TABLES_IN_ORDER) {
    // Read all rows from local
    const rows = await local.execute(`SELECT * FROM ${table}`);

    if (rows.rows.length === 0) {
      console.log(`  ⏭  ${table}: 0 rows (skipped)`);
      continue;
    }

    const columns = rows.columns;
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < rows.rows.length; i += batchSize) {
      const batch = rows.rows.slice(i, i + batchSize);
      const statements = batch.map((row) => ({
        sql: insertSql,
        args: columns.map((col) => {
          const val = row[col];
          return val === undefined ? null : val;
        }),
      }));

      await remote.batch(statements, "write");
      inserted += batch.length;
    }

    console.log(`  ✅ ${table}: ${inserted} rows migrated`);
    totalRows += inserted;
  }

  console.log(`\n🎉 Migration complete! ${totalRows} total rows migrated.`);

  local.close();
  remote.close();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
