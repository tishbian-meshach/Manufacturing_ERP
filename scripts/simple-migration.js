const fs = require('fs');
const path = require('path');

// Simple migration script that just outputs the SQL
// You can copy and run this SQL directly in your database

const migrationPath = path.join(__dirname, 'add-stock-column-to-items.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Copy and run this SQL in your database:');
console.log('==================================================');
console.log(migrationSQL);
console.log('==================================================');
console.log('');
console.log('Or save it to a file and run: psql -d your_database -f add-stock-column-to-items.sql');