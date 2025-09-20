const path = require('path');
const fs = require('fs');
const { sql } = require(path.join(__dirname, '..', 'lib', 'db'));

async function runStockMigration() {
  try {
    console.log('🚀 Starting stock column migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'add-stock-column-to-items.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await sql.unsafe(statement);
      }
    }

    console.log('✅ Stock column migration completed successfully!');
    console.log('📊 The items table now has a stock column that tracks current inventory levels.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runStockMigration();