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

async function removeExecutionOrder() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log("Removing execution_order from bom_operations table...");

    // Check if the column exists first
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'bom_operations'
      AND column_name = 'execution_order'
    `;

    if (columns.length > 0) {
      console.log("Found execution_order column, removing it...");

      // Drop the column
      await sql`
        ALTER TABLE bom_operations DROP COLUMN IF EXISTS execution_order
      `;

      console.log("✅ execution_order column removed successfully!");

      // Also remove the related index if it exists
      await sql`
        DROP INDEX IF EXISTS idx_bom_operations_execution_order
      `;

      console.log("✅ Related index removed successfully!");

      // Also remove the constraint if it exists
      await sql`
        ALTER TABLE bom_operations DROP CONSTRAINT IF EXISTS check_execution_order_positive
      `;

      console.log("✅ Related constraint removed successfully!");

    } else {
      console.log("execution_order column not found - may have been already removed");
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
    console.error("❌ Failed to remove execution_order:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

removeExecutionOrder();