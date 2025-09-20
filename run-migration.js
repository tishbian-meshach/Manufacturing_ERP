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

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log("Running multi-tenancy migration...");

    // Read and execute the migration SQL files
    const migrationFiles = [
      "scripts/05-add-multi-tenancy.sql",
      "scripts/06-assign-company-data.sql"
    ];

    for (const fileName of migrationFiles) {
      const migrationPath = path.join(__dirname, fileName);
      if (fs.existsSync(migrationPath)) {
        console.log(`Running migration: ${fileName}`);
        const migrationSQL = fs.readFileSync(migrationPath, "utf8");

        // Split the SQL into individual statements and execute them
        const statements = migrationSQL
          .split(";")
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));

        for (const statement of statements) {
          if (statement.trim()) {
            console.log("Executing:", statement.substring(0, 50) + "...");
            await sql.unsafe(statement);
          }
        }
      }
    }

    console.log("Multi-tenancy migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();