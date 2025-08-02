#!/usr/bin/env node

// Simple development mode test
process.env.NODE_ENV = 'development'
process.env.LOG_LEVEL = 'debug'

const mockContext = {
  awsRequestId: `dev-test-${Date.now()}`,
  functionName: 'safe-settings-dev-test',
  functionVersion: '$LATEST'
}

async function testDevelopmentMode() {
  console.log('🧪 Testing Development Mode (Mock Implementation)')
  console.log('================================================')
  
  // Test the mock app function directly
  const appFn = require('./index.js')
  const app = appFn({}, {})
  
  console.log('\n📋 Testing mock syncInstallation...')
  try {
    const result = await app.syncInstallation()
    console.log('✅ Mock sync result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Mock sync error:', error.message)
  }
  
  // Test the scheduler handler in development mode
  console.log('\n🔄 Testing scheduler handler in development mode...')
  const handler = require('./safe-settings-handler')
  
  const mockEvent = { 
    sync: true, 
    source: 'development-test',
    'detail-type': 'Manual Test'
  }
  
  try {
    const result = await handler.scheduler(mockEvent, mockContext)
    console.log('✅ Scheduler result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Scheduler error:', error.message)
  }
  
  console.log('\n✅ Development mode testing completed!')
}

testDevelopmentMode().catch(console.error)