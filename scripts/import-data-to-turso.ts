import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const dataDir = path.join(__dirname, "data");

async function main() {
  console.log("📥 Importing data to Turso...\n");

  // Read exported JSON files (from Neon export)
  const tables = ["users", "projects", "buildings", "floors", "units", "leads", "heroImages"];
  
  for (const table of tables) {
    const filePath = path.join(dataDir, `${table}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${table} (no data file)`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!data.length) {
      console.log(`⏭️  Skipping ${table} (empty)`);
      continue;
    }

    console.log(`📦 Importing ${data.length} ${table}...`);

    for (const row of data) {
      try {
        // Map table names to actual SQLite table names
        const tableMap: Record<string, string> = {
          users: "User",
          projects: "Project", 
          buildings: "Building",
          floors: "Floor",
          units: "Unit",
          leads: "Lead",
          heroImages: "HeroImage",
        };
        const sqlTable = tableMap[table];

        // Build INSERT statement
        const columns = Object.keys(row);
        const placeholders = columns.map(() => "?").join(", ");
        const values = columns.map((col) => {
          const val = row[col];
          // Convert booleans to integers for SQLite
          if (typeof val === "boolean") return val ? 1 : 0;
          // Convert Date objects to ISO strings
          if (val instanceof Date) return val.toISOString();
          return val;
        });

        const sql = `INSERT OR REPLACE INTO ${sqlTable} (${columns.join(", ")}) VALUES (${placeholders})`;
        await turso.execute({ sql, args: values });
      } catch (error: any) {
        console.error(`  ❌ Error inserting into ${table}:`, error.message);
      }
    }
    console.log(`  ✅ ${table} imported`);
  }

  console.log("\n✅ Data import complete!");
}

main().catch(console.error);
