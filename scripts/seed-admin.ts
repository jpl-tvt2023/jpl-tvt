/**
 * Admin Seed Script
 * 
 * Run with: npm run seed:admin
 * 
 * Set custom credentials via environment variables:
 *   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpass npm run seed:admin
 * 
 * Or edit the defaults below.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { users } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL || "file:./tvt-league.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "tvtadmin@league.com";
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "TVT League Admin";

  if (!adminPassword) {
    console.error("\n❌  ADMIN_PASSWORD environment variable is required.");
    console.error("   Usage: ADMIN_PASSWORD=yourSecurePassword npm run seed:admin\n");
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error("\n❌  Admin password must be at least 8 characters.\n");
    process.exit(1);
  }
  
  console.log("Creating admin user...");
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  
  try {
    await db.insert(users).values({
      id: randomUUID(),
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      isAdmin: true,
    });
    
    console.log("✓ Admin user created successfully!");
    console.log(`  Email: ${adminEmail}`);
    console.log("\n🔐 Keep your credentials safe!");
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
      console.log("⚠️  Admin user already exists with this email.");
      console.log("   Delete tvt-league.db and run again to reset.");
    } else {
      throw error;
    }
  }
}

seedAdmin().catch(console.error);
