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

async function addPlannedDatesTimes() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log("=========================================");
    console.log("ADDING PLANNED DATES AND TIMES");
    console.log("=========================================");

    // Get company ID
    const companyResult = await sql`SELECT id FROM companies LIMIT 1`;
    if (companyResult.length === 0) {
      console.error("No company found");
      process.exit(1);
    }
    const companyId = companyResult[0].id;

    // Update existing manufacturing orders with planned dates
    console.log("1. Adding planned dates to manufacturing orders...");

    const moResult = await sql`
      SELECT id, mo_number, status FROM manufacturing_orders
      WHERE company_id = ${companyId} AND planned_start_date IS NULL
      ORDER BY created_at
      LIMIT 25
    `;

    console.log(`Found ${moResult.length} manufacturing orders to update`);

    for (let i = 0; i < moResult.length; i++) {
      const mo = moResult[i];

      // Generate planned dates (next 30-90 days from now)
      const daysFromNow = Math.floor(Math.random() * 60) + 30; // 30-90 days
      const plannedStartDate = new Date();
      plannedStartDate.setDate(plannedStartDate.getDate() + daysFromNow);

      const durationDays = Math.floor(Math.random() * 14) + 3; // 3-17 days
      const plannedEndDate = new Date(plannedStartDate);
      plannedEndDate.setDate(plannedEndDate.getDate() + durationDays);

      await sql`
        UPDATE manufacturing_orders
        SET planned_start_date = ${plannedStartDate.toISOString().split('T')[0]},
            planned_end_date = ${plannedEndDate.toISOString().split('T')[0]},
            updated_at = NOW()
        WHERE id = ${mo.id}
      `;

      console.log(`✅ Updated MO ${mo.mo_number} with planned dates`);
    }

    // Update existing work orders with planned times
    console.log("2. Adding planned times to work orders...");

    const woResult = await sql`
      SELECT wo.id, wo.wo_number, wo.manufacturing_order_id, mo.planned_start_date, mo.planned_end_date
      FROM work_orders wo
      JOIN manufacturing_orders mo ON wo.manufacturing_order_id = mo.id
      WHERE wo.company_id = ${companyId} AND wo.planned_start_time IS NULL
        AND mo.planned_start_date IS NOT NULL
      ORDER BY wo.created_at
      LIMIT 50
    `;

    console.log(`Found ${woResult.length} work orders to update`);

    for (let i = 0; i < woResult.length; i++) {
      const wo = woResult[i];

      // Generate planned times for work order (within MO planned dates)
      const operationDurationHours = Math.floor(Math.random() * 4) + 2; // 2-6 hours per operation
      const startHour = 8 + Math.floor(Math.random() * 8); // 8 AM to 4 PM

      const plannedStartTime = new Date(wo.planned_start_date);
      plannedStartTime.setHours(startHour, 0, 0, 0);

      const plannedEndTime = new Date(plannedStartTime);
      plannedEndTime.setHours(plannedEndTime.getHours() + operationDurationHours);

      await sql`
        UPDATE work_orders
        SET planned_start_time = ${plannedStartTime.toISOString()},
            planned_end_time = ${plannedEndTime.toISOString()},
            updated_at = NOW()
        WHERE id = ${wo.id}
      `;

      console.log(`✅ Updated WO ${wo.wo_number} with planned times`);
    }

    // Verify the updates
    console.log("3. Verifying updates...");

    const moCount = await sql`
      SELECT COUNT(*) as count FROM manufacturing_orders
      WHERE company_id = ${companyId} AND planned_start_date IS NOT NULL
    `;

    const woCount = await sql`
      SELECT COUNT(*) as count FROM work_orders
      WHERE company_id = ${companyId} AND planned_start_time IS NOT NULL
    `;

    console.log("");
    console.log("=========================================");
    console.log("✅ PLANNED DATES AND TIMES ADDED SUCCESSFULLY!");
    console.log("=========================================");
    console.log("");
    console.log("📊 Update Summary:");
    console.log(`   • ${moCount[0].count} Manufacturing Orders with planned dates`);
    console.log(`   • ${woCount[0].count} Work Orders with planned times`);
    console.log("");
    console.log("🎯 Manufacturing orders now have:");
    console.log("   • Planned start dates and end dates");
    console.log("");
    console.log("🎯 Work orders now have:");
    console.log("   • Planned start times and end times");
    console.log("   • Realistic scheduling within manufacturing order timelines");

  } catch (error) {
    console.error("❌ Failed to add planned dates and times:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

addPlannedDatesTimes();