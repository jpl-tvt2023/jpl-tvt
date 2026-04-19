import { createClient } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) throw new Error("TURSO_CONNECTION_URL missing");

const client = createClient({ url, authToken });

async function columnExists(table: string, column: string) {
  const res = await client.execute(`PRAGMA table_info("${table}")`);
  return res.rows.some((r) => (r as unknown as { name: string }).name === column);
}

async function main() {
  const hasRole = await columnExists("users", "role");
  const hasIsAdmin = await columnExists("users", "is_admin");

  console.log(`Before: role=${hasRole}, is_admin=${hasIsAdmin}`);

  if (!hasRole) {
    await client.execute(`ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'admin' NOT NULL`);
    console.log("Added role column");
  }

  if (hasIsAdmin) {
    await client.execute(`UPDATE "users" SET "role" = 'admin' WHERE "is_admin" = 1`);
  }
  await client.execute({
    sql: `UPDATE "users" SET "role" = 'superadmin' WHERE "email" = ?`,
    args: ["tvtadmin@league.com"],
  });
  console.log("Backfilled role values");

  if (hasIsAdmin) {
    await client.execute(`ALTER TABLE "users" DROP COLUMN "is_admin"`);
    console.log("Dropped is_admin column");
  }

  const rows = await client.execute(`SELECT id, email, name, role FROM users`);
  console.log("Users after migration:");
  for (const r of rows.rows) console.log(r);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
