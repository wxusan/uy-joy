import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  console.log("Testing Turso connection...\n");
  
  try {
    // Test query
    const result = await turso.execute("SELECT * FROM User LIMIT 1");
    console.log("✅ Connection successful!");
    console.log("Users in DB:", result.rows.length > 0 ? result.rows[0] : "No users");
    
    const projects = await turso.execute("SELECT * FROM Project LIMIT 1");
    console.log("Projects:", projects.rows.length);
    
    const units = await turso.execute("SELECT COUNT(*) as count FROM Unit");
    console.log("Units count:", units.rows[0]);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

main();
