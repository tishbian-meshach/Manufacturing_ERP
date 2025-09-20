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

async function removeIsParallel() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log("Removing is_parallel from bom_operations table...");

    // Check if the column exists first
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'bom_operations'
      AND column_name = 'is_parallel'
    `;

    if (columns.length > 0) {
      console.log("Found is_parallel column, removing it...");

      // Drop the column
      await sql`
        ALTER TABLE bom_operations DROP COLUMN IF EXISTS is_parallel
      `;

      console.log("✅ is_parallel column removed successfully!");

    } else {
      console.log("is_parallel column not found - may have been already removed");
    }

    // Verify the table structure
    const remainingColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'bom_operations'
      ORDER BY ordinal_position
    `;

    console.log("\nUpdated bom_operations table structure:");
    remainingColumns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

  } catch (error) {
    console.error("❌ Failed to remove is_parallel:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

removeIsParallel();