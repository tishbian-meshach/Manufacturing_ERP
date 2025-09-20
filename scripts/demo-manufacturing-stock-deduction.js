// Demo script showing how manufacturing stock deduction works
// This demonstrates the automatic stock deduction when MOs are created

console.log('🔧 Manufacturing Order Stock Deduction Demo');
console.log('==========================================');

console.log('\n📋 Example Scenario:');
console.log('Manufacturing Order for Product A');
console.log('- Planned Quantity: 10 units');
console.log('- BOM Components:');
console.log('  • Steel Rod (RM001): 2 units per product = 20 units total');
console.log('  • Plastic Parts (RM003): 1 unit per product = 10 units total');
console.log('  • Screws (RM004): 4 units per product = 40 units total');

console.log('\n⚙️ Automatic Stock Deduction Process:');
console.log('1. MO Created → Status: draft');
console.log('2. System reads BOM components');
console.log('3. For each component: Quantity = BOM_qty × MO_planned_qty');
console.log('4. Creates stock ledger entries with voucher_type: "manufacturing_consumption"');
console.log('5. Updates items.stock column: stock = stock - deducted_quantity');
console.log('6. Work orders created for production steps');

console.log('\n📊 Stock Ledger Entries Created:');
console.log('Entry 1: Steel Rod (RM001) | Qty: -20 | Type: manufacturing_consumption');
console.log('Entry 2: Plastic Parts (RM003) | Qty: -10 | Type: manufacturing_consumption');
console.log('Entry 3: Screws (RM004) | Qty: -40 | Type: manufacturing_consumption');

console.log('\n📈 Stock Levels Updated:');
console.log('Steel Rod: 1000 → 980 units');
console.log('Plastic Parts: 200 → 190 units');
console.log('Screws: 5000 → 4960 units');

console.log('\n✅ Benefits:');
console.log('• Automatic stock tracking for production');
console.log('• Real-time inventory updates');
console.log('• Prevents stock discrepancies');
console.log('• Complete audit trail of material usage');
console.log('• Supports accurate cost calculations');

console.log('\n🔍 Stock Ledger will show:');
console.log('• Date & time of deduction');
console.log('• Item details and quantities');
console.log('• Manufacturing consumption type');
console.log('• Running stock balance after each transaction');

console.log('\n🚀 Ready to use! Create a manufacturing order with a BOM to see it in action.');