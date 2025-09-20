const fs = require('fs');
const path = require('path');

// Simple script to output the voucher removal migration SQL
// Copy and run this SQL in your database

const migrationPath = path.join(__dirname, 'remove-voucher-no-from-stock-ledger.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Copy and run this SQL in your database to remove voucher_no column:');
console.log('==================================================');
console.log(migrationSQL);
console.log('==================================================');
console.log('');
console.log('This will remove the voucher_no column from the stock_ledger table.');