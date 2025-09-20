// Simple test script to check if the export API is working
// Run this to test the export functionality

const testExport = async () => {
  try {
    console.log('Testing export API...')

    // Test the export endpoint
    const response = await fetch('http://localhost:3000/api/reports/export?type=all&format=csv', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your auth token here if needed
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      const text = await response.text()
      console.log('Response length:', text.length)
      console.log('Response preview:', text.substring(0, 500) + '...')
      console.log('✅ Export API is working!')
    } else {
      const errorText = await response.text()
      console.log('❌ Export API failed:', errorText)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Only run if this script is called directly
if (require.main === module) {
  testExport()
}

module.exports = { testExport }