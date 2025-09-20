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

async function createComprehensiveSeedData() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log("=========================================");
    console.log("CREATING COMPREHENSIVE SEED DATA");
    console.log("=========================================");

    // First, ensure we have a company
    console.log("1. Setting up company...");
    let companyId = 1;
    try {
      const existingCompany = await sql`SELECT id FROM companies LIMIT 1`;
      if (existingCompany.length === 0) {
        await sql`
          INSERT INTO companies (name, domain, created_at, updated_at)
          VALUES ('Manufacturing Corp', 'manufacturing.com', NOW(), NOW())
        `;
        console.log("✅ Company created");
      } else {
        companyId = existingCompany[0].id;
        console.log("✅ Company exists");
      }
    } catch (error) {
      console.log("Company table might not exist, skipping...");
    }

    // Create work centers
    console.log("2. Creating work centers...");
    const workCenters = [
      { name: 'Assembly Line A', capacity: 8 },
      { name: 'Assembly Line B', capacity: 6 },
      { name: 'CNC Machine Center', capacity: 4 },
      { name: 'Quality Control Station', capacity: 12 },
      { name: 'Packaging Line', capacity: 10 },
      { name: 'Welding Station', capacity: 3 },
      { name: 'Painting Booth', capacity: 5 },
      { name: 'Raw Material Prep', capacity: 7 }
    ];

    for (const wc of workCenters) {
      // Check if work center already exists
      const existing = await sql`
        SELECT id FROM work_centers WHERE name = ${wc.name} AND company_id = ${companyId}
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO work_centers (name, description, capacity_per_hour, company_id, is_active, created_at, updated_at)
          VALUES (${wc.name}, ${wc.name + ' for manufacturing operations'}, ${wc.capacity}, ${companyId}, true, NOW(), NOW())
        `;
      }
    }
    console.log("✅ Work centers created");

    // Create raw materials
    console.log("3. Creating raw materials...");
    const rawMaterials = [
      { code: 'RM001', name: 'Steel Sheet 2mm', uom: 'kg', rate: 8.50 },
      { code: 'RM002', name: 'Aluminum Rod 10mm', uom: 'meter', rate: 12.00 },
      { code: 'RM003', name: 'Plastic Pellets HDPE', uom: 'kg', rate: 6.75 },
      { code: 'RM004', name: 'Copper Wire 2mm', uom: 'meter', rate: 4.25 },
      { code: 'RM005', name: 'Paint - Blue Industrial', uom: 'liter', rate: 15.50 },
      { code: 'RM006', name: 'Screws M6x25', uom: 'pcs', rate: 0.08 },
      { code: 'RM007', name: 'Nuts M6', uom: 'pcs', rate: 0.05 },
      { code: 'RM008', name: 'Washers M6', uom: 'pcs', rate: 0.03 },
      { code: 'RM009', name: 'Rubber Gasket 50mm', uom: 'pcs', rate: 2.25 },
      { code: 'RM010', name: 'Circuit Board Basic', uom: 'pcs', rate: 8.90 },
      { code: 'RM011', name: 'Motor 12V DC', uom: 'pcs', rate: 25.00 },
      { code: 'RM012', name: 'Battery 9V', uom: 'pcs', rate: 3.50 },
      { code: 'RM013', name: 'LED Strip 5m', uom: 'meter', rate: 18.75 },
      { code: 'RM014', name: 'PVC Pipe 25mm', uom: 'meter', rate: 5.25 },
      { code: 'RM015', name: 'Glass Panel 300x200mm', uom: 'pcs', rate: 22.00 }
    ];

    for (const rm of rawMaterials) {
      // Check if item already exists
      const existing = await sql`
        SELECT id FROM items WHERE item_code = ${rm.code} AND company_id = ${companyId}
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO items (item_code, item_name, description, unit_of_measure, item_type, standard_rate, company_id, is_active, created_at, updated_at)
          VALUES (${rm.code}, ${rm.name}, ${rm.name}, ${rm.uom}, 'raw_material', ${rm.rate}, ${companyId}, true, NOW(), NOW())
        `;
      }
    }
    console.log("✅ Raw materials created");

    // Create semi-finished goods
    console.log("4. Creating semi-finished goods...");
    const semiFinished = [
      { code: 'SF001', name: 'Cut Steel Frame', uom: 'pcs', rate: 45.00 },
      { code: 'SF002', name: 'Bent Aluminum Bracket', uom: 'pcs', rate: 28.50 },
      { code: 'SF003', name: 'Injection Molded Plastic Part', uom: 'pcs', rate: 12.75 },
      { code: 'SF004', name: 'Assembled Circuit Module', uom: 'pcs', rate: 35.25 },
      { code: 'SF005', name: 'Welded Metal Joint', uom: 'pcs', rate: 18.90 }
    ];

    for (const sf of semiFinished) {
      // Check if item already exists
      const existing = await sql`
        SELECT id FROM items WHERE item_code = ${sf.code} AND company_id = ${companyId}
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO items (item_code, item_name, description, unit_of_measure, item_type, standard_rate, company_id, is_active, created_at, updated_at)
          VALUES (${sf.code}, ${sf.name}, ${sf.name}, ${sf.uom}, 'semi_finished', ${sf.rate}, ${companyId}, true, NOW(), NOW())
        `;
      }
    }
    console.log("✅ Semi-finished goods created");

    // Create finished goods and their BOMs
    console.log("5. Creating finished goods and BOMs...");

    const finishedGoods = [
      { code: 'FG001', name: 'Industrial Pump Model A', rate: 285.00 },
      { code: 'FG002', name: 'LED Lighting Fixture', rate: 95.50 },
      { code: 'FG003', name: 'Plastic Storage Container', rate: 42.75 },
      { code: 'FG004', name: 'Metal Tool Cabinet', rate: 165.25 },
      { code: 'FG005', name: 'Electronic Control Panel', rate: 312.00 },
      { code: 'FG006', name: 'PVC Pipe Fitting Set', rate: 78.90 },
      { code: 'FG007', name: 'Aluminum Window Frame', rate: 145.50 },
      { code: 'FG008', name: 'Circuit Breaker Box', rate: 198.75 },
      { code: 'FG009', name: 'Hydraulic Valve Assembly', rate: 425.00 },
      { code: 'FG010', name: 'Solar Panel Mount', rate: 155.25 },
      { code: 'FG011', name: 'Conveyor Belt Roller', rate: 67.50 },
      { code: 'FG012', name: 'Steel Security Door', rate: 385.00 },
      { code: 'FG013', name: 'Plastic Cable Duct', rate: 23.75 },
      { code: 'FG014', name: 'Copper Wire Harness', rate: 89.25 },
      { code: 'FG015', name: 'Glass Display Case', rate: 275.50 },
      { code: 'FG016', name: 'Motor Control Unit', rate: 445.00 },
      { code: 'FG017', name: 'PVC Drainage System', rate: 134.75 },
      { code: 'FG018', name: 'Aluminum Heat Sink', rate: 56.25 },
      { code: 'FG019', name: 'Electronic Timer Module', rate: 78.90 },
      { code: 'FG020', name: 'Steel Pipe Flange', rate: 92.50 },
      { code: 'FG021', name: 'Plastic Gear Set', rate: 34.25 },
      { code: 'FG022', name: 'Copper Ground Rod', rate: 45.75 },
      { code: 'FG023', 'name': 'LED Indicator Panel', rate: 125.00 },
      { code: 'FG024', name: 'Metal Filing Cabinet', rate: 295.50 },
      { code: 'FG025', name: 'Circuit Protection Device', rate: 167.25 },
      { code: 'FG026', name: 'PVC Conduit Pipe', rate: 18.75 },
      { code: 'FG027', name: 'Aluminum Ladder Frame', rate: 225.00 },
      { code: 'FG028', name: 'Electronic Relay Board', rate: 145.75 },
      { code: 'FG029', name: 'Steel Manhole Cover', rate: 185.25 },
      { code: 'FG030', name: 'Plastic Cable Tie Set', rate: 12.50 },
      { code: 'FG031', name: 'Copper Busbar', rate: 78.90 },
      { code: 'FG032', name: 'LED Emergency Light', rate: 95.25 },
      { code: 'FG033', name: 'Metal Tool Box', rate: 145.00 },
      { code: 'FG034', name: 'Circuit Tester Kit', rate: 234.75 },
      { code: 'FG035', name: 'PVC Water Pipe', rate: 25.50 },
      { code: 'FG036', name: 'Aluminum Window Screen', rate: 67.25 },
      { code: 'FG037', name: 'Electronic Voltage Regulator', rate: 189.00 },
      { code: 'FG038', name: 'Steel Angle Bracket', rate: 34.75 },
      { code: 'FG039', name: 'Plastic Storage Bin', rate: 28.50 },
      { code: 'FG040', name: 'Copper Cable Lug', rate: 15.25 },
      { code: 'FG041', name: 'LED Strip Light', rate: 45.00 },
      { code: 'FG042', name: 'Metal Lock Box', rate: 125.75 },
      { code: 'FG043', name: 'Circuit Breaker Panel', rate: 345.50 },
      { code: 'FG044', name: 'PVC Electrical Conduit', rate: 22.25 },
      { code: 'FG045', name: 'Aluminum Heat Exchanger', rate: 425.00 },
      { code: 'FG046', name: 'Electronic Timer Switch', rate: 67.75 },
      { code: 'FG047', name: 'Steel Pipe Elbow', rate: 48.50 },
      { code: 'FG048', name: 'Plastic Cable Organizer', rate: 19.25 },
      { code: 'FG049', name: 'Copper Ground Clamp', rate: 12.75 },
      { code: 'FG050', name: 'LED Warning Light', rate: 85.00 }
    ];

    for (let i = 0; i < finishedGoods.length; i++) {
      const fg = finishedGoods[i];

      // Check if finished good already exists
      const existingFG = await sql`
        SELECT id FROM items WHERE item_code = ${fg.code} AND company_id = ${companyId}
      `;

      if (existingFG.length === 0) {
        // Create finished good
        await sql`
          INSERT INTO items (item_code, item_name, description, unit_of_measure, item_type, standard_rate, company_id, is_active, created_at, updated_at)
          VALUES (${fg.code}, ${fg.name}, ${fg.name}, 'pcs', 'finished_good', ${fg.rate}, ${companyId}, true, NOW(), NOW())
        `;
      }

      // Create BOM for this finished good
      const bomName = `BOM for ${fg.name}`;
      const bomResult = await sql`
        INSERT INTO bom (bom_name, item_id, quantity, company_id, is_active, created_at, updated_at)
        SELECT ${bomName}, id, 1, ${companyId}, true, NOW(), NOW()
        FROM items WHERE item_code = ${fg.code} AND company_id = ${companyId}
        RETURNING id
      `;

      if (bomResult.length > 0) {
        const bomId = bomResult[0].id;

        // Add BOM components (2-4 random components per BOM)
        const numComponents = Math.floor(Math.random() * 3) + 2; // 2-4 components
        const componentIndices = [];
        while (componentIndices.length < numComponents) {
          const randomIndex = Math.floor(Math.random() * rawMaterials.length);
          if (!componentIndices.includes(randomIndex)) {
            componentIndices.push(randomIndex);
          }
        }

        for (const compIndex of componentIndices) {
          const component = rawMaterials[compIndex];
          const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 units

          await sql`
            INSERT INTO bom_items (bom_id, item_id, quantity, company_id, created_at)
            SELECT ${bomId}, id, ${quantity}, ${companyId}, NOW()
            FROM items WHERE item_code = ${component.code} AND company_id = ${companyId}
          `;
        }

        // Add BOM operations (1-3 operations per BOM)
        const numOperations = Math.floor(Math.random() * 3) + 1; // 1-3 operations
        const operationNames = ['Assembly', 'Quality Check', 'Packaging', 'Testing', 'Welding', 'Machining'];

        for (let opIndex = 0; opIndex < numOperations; opIndex++) {
          const operationName = operationNames[Math.floor(Math.random() * operationNames.length)];
          const duration = Math.floor(Math.random() * 60) + 30; // 30-90 minutes
          const workCenterIndex = Math.floor(Math.random() * workCenters.length);

          await sql`
            INSERT INTO bom_operations (bom_id, work_center_id, operation_name, operation_description, duration_minutes, company_id, created_at, updated_at)
            SELECT ${bomId}, id, ${operationName}, ${operationName + ' operation for ' + fg.name}, ${duration}, ${companyId}, NOW(), NOW()
            FROM work_centers WHERE name = ${workCenters[workCenterIndex].name} AND company_id = ${companyId}
          `;
        }
      }
    }
    console.log("✅ Finished goods and BOMs created");

    // Create stock ledger entries for raw materials
    console.log("6. Creating stock ledger entries...");
    for (const rm of rawMaterials) {
      const initialStock = Math.floor(Math.random() * 500) + 100; // 100-600 units

      await sql`
        INSERT INTO stock_ledger (item_id, voucher_type, voucher_no, actual_qty, qty_after_transaction, rate, value_after_transaction, company_id, posting_date, posting_time, created_at)
        SELECT id, 'stock_adjustment', 'INIT-' || ${rm.code}, ${initialStock}, ${initialStock}, standard_rate, ${initialStock} * standard_rate, ${companyId}, CURRENT_DATE, CURRENT_TIME, NOW()
        FROM items WHERE item_code = ${rm.code} AND company_id = ${companyId}
      `;
    }
    console.log("✅ Stock ledger entries created");

    // Create some manufacturing orders
    console.log("7. Creating manufacturing orders...");
    const moStatuses = ['draft', 'in_progress', 'completed'];
    const numMOs = 25; // Create 25 manufacturing orders

    for (let i = 0; i < numMOs; i++) {
      const fgIndex = Math.floor(Math.random() * finishedGoods.length);
      const fg = finishedGoods[fgIndex];
      const plannedQty = Math.floor(Math.random() * 50) + 10; // 10-60 units
      const status = moStatuses[Math.floor(Math.random() * moStatuses.length)];

      // Generate planned dates (next 30-90 days from now)
      const daysFromNow = Math.floor(Math.random() * 60) + 30; // 30-90 days
      const plannedStartDate = new Date();
      plannedStartDate.setDate(plannedStartDate.getDate() + daysFromNow);

      const durationDays = Math.floor(Math.random() * 14) + 3; // 3-17 days
      const plannedEndDate = new Date(plannedStartDate);
      plannedEndDate.setDate(plannedEndDate.getDate() + durationDays);

      const moNumber = 'MO-' + String(2000 + i).padStart(4, '0'); // Use 2000+ to avoid conflicts

      // Check if MO already exists
      const existingMO = await sql`
        SELECT id FROM manufacturing_orders WHERE mo_number = ${moNumber} AND company_id = ${companyId}
      `;

      if (existingMO.length === 0) {
        const moResult = await sql`
          INSERT INTO manufacturing_orders (mo_number, item_id, bom_id, planned_qty, status, planned_start_date, planned_end_date, company_id, created_at, updated_at)
          SELECT ${moNumber}, i.id, b.id, ${plannedQty}, ${status}, ${plannedStartDate.toISOString().split('T')[0]}, ${plannedEndDate.toISOString().split('T')[0]}, ${companyId}, NOW(), NOW()
          FROM items i
          LEFT JOIN bom b ON b.item_id = i.id AND b.company_id = ${companyId}
          WHERE i.item_code = ${fg.code} AND i.company_id = ${companyId}
          RETURNING id
        `;
      }

      if (moResult.length > 0 && status === 'in_progress') {
        const moId = moResult[0].id;

        // Create work orders for this MO based on BOM operations
        const bomOperations = await sql`
          SELECT bo.* FROM bom_operations bo
          JOIN bom b ON bo.bom_id = b.id
          JOIN manufacturing_orders mo ON b.id = mo.bom_id
          WHERE mo.id = ${moId} AND bo.company_id = ${companyId}
        `;

        if (existingMO.length === 0) {
          const moResult = await sql`
            INSERT INTO manufacturing_orders (mo_number, item_id, bom_id, planned_qty, status, planned_start_date, planned_end_date, company_id, created_at, updated_at)
            SELECT ${moNumber}, i.id, b.id, ${plannedQty}, ${status}, ${plannedStartDate.toISOString().split('T')[0]}, ${plannedEndDate.toISOString().split('T')[0]}, ${companyId}, NOW(), NOW()
            FROM items i
            LEFT JOIN bom b ON b.item_id = i.id AND b.company_id = ${companyId}
            WHERE i.item_code = ${fg.code} AND i.company_id = ${companyId}
            RETURNING id
          `;

          const moId = moResult[0]?.id;

          if (moId && status === 'in_progress') {
            // Create work orders for this MO based on BOM operations
            for (let opIndex = 0; opIndex < bomOperations.length; opIndex++) {
              const operation = bomOperations[opIndex];
              const woNumber = `WO-${String(2000 + i).padStart(4, '0')}-${String(opIndex + 1).padStart(2, '0')}`;
              const woStatus = Math.random() > 0.3 ? 'completed' : 'in_progress'; // 70% completed, 30% in progress

              // Generate planned times for work order (within MO planned dates)
              const operationDurationHours = Math.floor(Math.random() * 4) + 2; // 2-6 hours per operation
              const startHour = 8 + Math.floor(Math.random() * 8); // 8 AM to 4 PM
              const plannedStartTime = new Date(plannedStartDate);
              plannedStartTime.setHours(startHour, 0, 0, 0);

              const plannedEndTime = new Date(plannedStartTime);
              plannedEndTime.setHours(plannedEndTime.getHours() + operationDurationHours);

              // Check if WO already exists
              const existingWO = await sql`
                SELECT id FROM work_orders WHERE wo_number = ${woNumber} AND company_id = ${companyId}
              `;

              if (existingWO.length === 0) {
                await sql`
                  INSERT INTO work_orders (wo_number, manufacturing_order_id, work_center_id, operation_name, planned_qty, status, planned_start_time, planned_end_time, company_id, created_at, updated_at)
                  VALUES (${woNumber}, ${moId}, ${operation.work_center_id}, ${operation.operation_name}, ${plannedQty}, ${woStatus}, ${plannedStartTime.toISOString()}, ${plannedEndTime.toISOString()}, ${companyId}, NOW(), NOW())
                `;
              }
            }
          }
        }
      }
    }
    console.log("✅ Manufacturing orders and work orders created");

    console.log("");
    console.log("=========================================");
    console.log("✅ COMPREHENSIVE SEED DATA CREATED SUCCESSFULLY!");
    console.log("=========================================");
    console.log("");
    console.log("📊 Data Summary:");
    console.log(`   • ${workCenters.length} Work Centers`);
    console.log(`   • ${rawMaterials.length} Raw Materials`);
    console.log(`   • ${semiFinished.length} Semi-finished Goods`);
    console.log(`   • ${finishedGoods.length} Finished Goods`);
    console.log(`   • ${finishedGoods.length} BOMs with components and operations`);
    console.log(`   • ${rawMaterials.length} Stock ledger entries`);
    console.log(`   • ${numMOs} Manufacturing orders`);
    console.log(`   • Work orders created for in-progress MOs`);
    console.log("");
    console.log("🎯 Ready for Analytics!");
    console.log("   Dashboard, Reports, and Analytics pages now have real data instead of mock data.");

  } catch (error) {
    console.error("❌ Failed to create seed data:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

createComprehensiveSeedData();