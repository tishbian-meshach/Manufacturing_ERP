import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Create a singleton SQL client
export const sql = neon(process.env.DATABASE_URL)

// Database utility functions for work centers
export async function getWorkCenters(companyId?: number) {
  let query = sql`
    SELECT * FROM work_centers
    WHERE is_active = true
    ORDER BY name
  `;

  if (companyId) {
    query = sql`
      SELECT * FROM work_centers
      WHERE is_active = true AND company_id = ${companyId}
      ORDER BY name
    `;
  }

  return await query;
}

// Database utility functions for manufacturing orders
export async function getManufacturingOrders(companyId?: number) {
  let query = sql`
    SELECT
      mo.*,
      i.item_name,
      i.item_code
    FROM manufacturing_orders mo
    LEFT JOIN items i ON mo.item_id = i.id
    ORDER BY mo.created_at DESC
  `;

  if (companyId) {
    query = sql`
      SELECT
        mo.*,
        i.item_name,
        i.item_code
      FROM manufacturing_orders mo
      LEFT JOIN items i ON mo.item_id = i.id AND i.company_id = ${companyId}
      WHERE mo.company_id = ${companyId}
      ORDER BY mo.created_at DESC
    `;
  }

  return await query;
}

// User management functions
export async function getUserById(id: string) {
  const result = await sql`
    SELECT * FROM users WHERE id = ${id}
  `
  return result[0] || null
}

export async function getUserByEmail(email: string) {
  const result = await sql`
    SELECT * FROM users WHERE email = ${email}
  `
  return result[0] || null
}

export async function createUser(userData: {
  id: string
  email: string
  name: string
  role?: string
}) {
  const { id, email, name, role = "operator" } = userData

  const result = await sql`
    INSERT INTO users (id, email, name, role)
    VALUES (${id}, ${email}, ${name}, ${role})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      updated_at = NOW()
    RETURNING *
  `
  return result[0]
}

// Stock utility functions
export async function getCurrentStock(itemId: number, companyId?: number) {
  let query = sql`
    SELECT
      i.item_code,
      i.item_name,
      COALESCE(SUM(sl.actual_qty), 0) as current_stock
    FROM items i
    LEFT JOIN stock_ledger sl ON i.id = sl.item_id
    WHERE i.id = ${itemId}
  `;

  if (companyId) {
    query = sql`
      SELECT
        i.item_code,
        i.item_name,
        COALESCE(SUM(sl.actual_qty), 0) as current_stock
      FROM items i
      LEFT JOIN stock_ledger sl ON i.id = sl.item_id AND sl.company_id = ${companyId}
      WHERE i.id = ${itemId} AND i.company_id = ${companyId}
    `;
  }

  const result = await query;
  return result[0] || null;
}

export async function getAllItemsWithStock(companyId?: number) {
  let query = sql`
    SELECT
      i.id,
      i.item_code,
      i.item_name,
      i.item_type,
      i.unit_of_measure,
      i.standard_rate,
      COALESCE(SUM(sl.actual_qty), 0) as current_stock
    FROM items i
    LEFT JOIN stock_ledger sl ON i.id = sl.item_id
    WHERE i.is_active = true
  `;

  if (companyId) {
    query = sql`
      SELECT
        i.id,
        i.item_code,
        i.item_name,
        i.item_type,
        i.unit_of_measure,
        i.standard_rate,
        COALESCE(SUM(sl.actual_qty), 0) as current_stock
      FROM items i
      LEFT JOIN stock_ledger sl ON i.id = sl.item_id AND sl.company_id = ${companyId}
      WHERE i.is_active = true AND i.company_id = ${companyId}
    `;
  }

  const result = await query;
  return result;
}
