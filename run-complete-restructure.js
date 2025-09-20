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

async function runCompleteRestructure() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log("=========================================");
    console.log("STARTING COMPLETE DATABASE RESTRUCTURE");
    console.log("=========================================");
    console.log("⚠️  WARNING: This will DROP ALL existing tables and recreate them!");
    console.log("Make sure you have backed up any important data.");
    console.log("");

    // Read the complete restructure SQL file
    const restructurePath = path.join(__dirname, "scripts", "09-complete-database-restructure.sql");
    if (!fs.existsSync(restructurePath)) {
      console.error("Complete restructure script not found:", restructurePath);
      process.exit(1);
    }

    console.log("Reading complete restructure script...");
    const restructureSQL = fs.readFileSync(restructurePath, "utf8");

    // Split the SQL into individual statements and execute them
    const statements = restructureSQL
      .split(";")
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith("--") && !stmt.startsWith("DO $$"));

    console.log(`Found ${statements.length} SQL statements to execute...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`);
        try {
          await sql.unsafe(statement);
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.error("Statement:", statement);
          throw error;
        }
      }
    }

    // Execute the final DO block separately
    console.log("Executing completion message...");
    const completionBlock = `
    DO $$
    BEGIN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'DATABASE RESTRUCTURE COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'New BOM Operations Structure:';
        RAISE NOTICE '- Components: Stored in bom_items table';
        RAISE NOTICE '- Operations: Stored in bom_operations table (BOM-level)';
        RAISE NOTICE '- Work Centers: Linked to operations';
        RAISE NOTICE '- Multi-tenancy: All tables have company_id';
        RAISE NOTICE '';
        RAISE NOTICE 'Sample Data Created:';
        RAISE NOTICE '- 1 Company (Default Company)';
        RAISE NOTICE '- 4 Users (admin, manager, 2 operators)';
        RAISE NOTICE '- 5 Work Centers';
        RAISE NOTICE '- 11 Items (raw materials, semi-finished, finished goods)';
        RAISE NOTICE '- 1 BOM with 4 components and 3 operations';
        RAISE NOTICE '- Initial stock ledger entries';
        RAISE NOTICE '';
        RAISE NOTICE 'Login Credentials:';
        RAISE NOTICE '- admin@company.com : password123';
        RAISE NOTICE '- manager@company.com : password123';
        RAISE NOTICE '- operator1@company.com : password123';
        RAISE NOTICE '- operator2@company.com : password123';
        RAISE NOTICE '========================================';
    END $$;`;

    await sql.unsafe(completionBlock);

    console.log("");
    console.log("=========================================");
    console.log("✅ DATABASE RESTRUCTURE COMPLETED SUCCESSFULLY!");
    console.log("=========================================");
    console.log("The database now supports the new BOM structure with operations.");
    console.log("You can now create BOMs with components and manufacturing operations.");

  } catch (error) {
    console.error("❌ Complete restructure failed:", error);
    console.error("");
    console.error("Troubleshooting:");
    console.error("1. Make sure DATABASE_URL is set in .env file");
    console.error("2. Check database connection and permissions");
    console.error("3. Ensure no other connections are using the database");
    process.exit(1);
  }
}

runCompleteRestructure();