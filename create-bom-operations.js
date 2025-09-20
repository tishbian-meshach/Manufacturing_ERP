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

async function createBOMOperationsTable() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log("Creating bom_operations table...");

    // Create the bom_operations table
    await sql`
      CREATE TABLE IF NOT EXISTS bom_operations (
        id SERIAL PRIMARY KEY,
        bom_id INTEGER REFERENCES bom(id) ON DELETE CASCADE,
        work_center_id INTEGER REFERENCES work_centers(id) ON DELETE CASCADE,
        operation_name TEXT NOT NULL,
        operation_description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        execution_order INTEGER NOT NULL DEFAULT 1,
        is_parallel BOOLEAN DEFAULT FALSE,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log("✅ bom_operations table created successfully!");

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_bom_operations_bom_id ON bom_operations(bom_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_bom_operations_work_center_id ON bom_operations(work_center_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_bom_operations_company_id ON bom_operations(company_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_bom_operations_execution_order ON bom_operations(execution_order)
    `;

    console.log("✅ Indexes created successfully!");

    // Add updated_at trigger
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    await sql`
      CREATE TRIGGER update_bom_operations_updated_at
      BEFORE UPDATE ON bom_operations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `;

    console.log("✅ Trigger created successfully!");

    // Add constraints
    await sql`
      ALTER TABLE bom_operations
      ADD CONSTRAINT check_duration_positive CHECK (duration_minutes >= 0)
    `;

    await sql`
      ALTER TABLE bom_operations
      ADD CONSTRAINT check_execution_order_positive CHECK (execution_order > 0)
    `;

    console.log("✅ Constraints added successfully!");

    // Verify the table was created
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'bom_operations'
    `;

    if (result.length > 0) {
      console.log("✅ Verification: bom_operations table exists!");

      // Show table structure
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'bom_operations'
        ORDER BY ordinal_position
      `;

      console.log("\nTable structure:");
      columns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
      });

    } else {
      console.log("❌ Table creation failed!");
    }

  } catch (error) {
    console.error("❌ Table creation failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

createBOMOperationsTable();