const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

// Load .env file
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const envVars = envContent.split("\n").filter(line => line.includes("="));
  envVars.forEach(line => {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=");
    process.env[key] = value;
  });
}

async function testDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log("Testing database connection...");

    // Check all required tables for BOM operations
    const requiredTables = ['bom', 'bom_items', 'bom_operations', 'work_centers', 'companies', 'items'];
    const tableResults = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ANY(${requiredTables})
    `;

    console.log("Checking required tables for BOM operations:");
    const foundTables = tableResults.map(t => t.table_name);

    requiredTables.forEach(tableName => {
      if (foundTables.includes(tableName)) {
        console.log(`✅ ${tableName} - exists`);
      } else {
        console.log(`❌ ${tableName} - MISSING`);
      }
    });

    const allExist = requiredTables.every(table => foundTables.includes(table));

    if (allExist) {
      console.log("\n✅ All required tables exist! BOM creation should work now.");

      // Check bom_operations table structure specifically
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'bom_operations'
        ORDER BY ordinal_position
      `;

      console.log("\nbom_operations table structure:");
      columns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
      });

    } else {
      console.log("\n❌ Some required tables are missing!");

      // List all available tables
      const allTables = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;

      console.log("\nAll available tables:");
      allTables.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    }

  } catch (error) {
    console.error("Database test failed:", error.message);
    process.exit(1);
  }
}

testDatabase();