#!/usr/bin/env node

// Local testing script for Safe Settings Lambda handlers
require('dotenv').config({ path: '.env.local' }) // Load local env vars if available

const handler = require('./safe-settings-handler')

// Mock Lambda context
const mockContext = {
  awsRequestId: `local-test-${Date.now()}`,
  functionName: 'safe-settings-local-test',
  functionVersion: '$LATEST',
  getRemainingTimeInMillis: () => 30000
}

// Check if we have GitHub App credentials
function hasGitHubCredentials() {
  return process.env.APP_ID && process.env.PRIVATE_KEY && process.env.WEBHOOK_SECRET
}

// Test webhook handler
async function testWebhookHandler() {
  console.log('\n🔗 Testing Webhook Handler...')
  
  const mockWebhookEvent = {
    httpMethod: 'POST',
    headers: {
      'x-github-event': 'push',
      'x-github-delivery': 'test-delivery-id',
      'x-hub-signature-256': 'sha256=test-signature'
    },
    body: JSON.stringify({
      action: 'opened',
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo'
      },
      sender: {
        login: 'test-user'
      }
    })
  }
  
  try {
    const result = await handler.webhooks(mockWebhookEvent, mockContext)
    console.log('✅ Webhook handler result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Webhook handler error:', error.message)
  }
}

// Test scheduler handler
async function testSchedulerHandler() {
  console.log('\n🔄 Testing Scheduler Handler...')
  
  const mockSchedulerEvent = {
    source: 'aws.events',
    'detail-type': 'Scheduled Event',
    detail: {},
    time: new Date().toISOString()
  }
  
  try {
    const result = await handler.scheduler(mockSchedulerEvent, mockContext)
    console.log('✅ Scheduler handler result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Scheduler handler error:', error.message)
  }
}

// Test manual sync trigger
async function testManualSync() {
  console.log('\n⚡ Testing Manual Sync Trigger...')
  
  const mockManualEvent = {
    sync: true,
    source: 'manual'
  }
  
  try {
    const result = await handler.scheduler(mockManualEvent, mockContext)
    console.log('✅ Manual sync result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Manual sync error:', error.message)
  }
}

// Test development mode (mock implementation)
async function testDevelopmentMode() {
  console.log('\n🧪 Testing Development Mode (Mock Implementation)...')
  
  // Force development mode
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
  
  // Clear require cache to pick up new env
  delete require.cache[require.resolve('./index.js')]
  delete require.cache[require.resolve('./safe-settings-handler.js')]
  
  // Re-require the handler with development mode
  const devHandler = require('./safe-settings-handler')
  
  const mockEvent = { sync: true, source: 'development-test' }
  
  try {
    const result = await devHandler.scheduler(mockEvent, mockContext)
    console.log('✅ Development mode result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Development mode error:', error.message)
  } finally {
    // Restore original environment
    process.env.NODE_ENV = originalNodeEnv
    // Clear cache again to reset
    delete require.cache[require.resolve('./index.js')]
    delete require.cache[require.resolve('./safe-settings-handler.js')]
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Starting Local Lambda Handler Tests')
  console.log('=====================================')
  
  // Set debug logging
  process.env.LOG_LEVEL = 'debug'
  
  if (hasGitHubCredentials()) {
    console.log('✅ GitHub App credentials found - testing with real Probot')
    await testWebhookHandler()
    await testSchedulerHandler()
    await testManualSync()
  } else {
    console.log('⚠️  No GitHub App credentials found')
    console.log('   Create .env.local with APP_ID, PRIVATE_KEY, WEBHOOK_SECRET for full testing')
    console.log('   Testing error handling and development mode...\n')
    
    await testWebhookHandler() // Will show proper error handling
    await testSchedulerHandler() // Will show proper error handling
    await testDevelopmentMode() // Will use mock implementation
  }
  
  console.log('\n✅ All local tests completed!')
  console.log('\n💡 Tips:')
  console.log('   - Copy .env.example to .env.local and add real credentials for full testing')
  console.log('   - Use npm run test:webhook or npm run test:scheduler for specific tests')
  console.log('   - Check logs show proper error handling and request ID tracking')
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes('--webhook')) {
  testWebhookHandler()
} else if (args.includes('--scheduler')) {
  testSchedulerHandler()
} else if (args.includes('--manual')) {
  testManualSync()
} else {
  runAllTests()
}