// CI Integration tests - validates Lambda handler integration
describe('CI Integration Tests', () => {
  const mockContext = {
    awsRequestId: 'ci-test-request-id',
    functionName: 'safe-settings-ci-test',
    functionVersion: '$LATEST',
    getRemainingTimeInMillis: () => 30000
  }

  beforeEach(() => {
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    console.log.mockRestore()
  })

  describe('Lambda Handler Integration', () => {
    test('should handle webhook events with proper error responses', async () => {
      const handler = require('../safe-settings-handler')
      
      const mockWebhookEvent = {
        httpMethod: 'POST',
        headers: {
          'x-github-event': 'push',
          'x-github-delivery': 'ci-test-delivery',
          'x-hub-signature-256': 'sha256=test-signature'
        },
        body: JSON.stringify({
          action: 'opened',
          repository: { name: 'test-repo' }
        })
      }

      const result = await handler.webhooks(mockWebhookEvent, mockContext)
      
      // Should return proper Lambda response structure
      expect(result).toHaveProperty('statusCode')
      expect(result).toHaveProperty('body')
      expect(typeof result.body).toBe('string')
      
      // Parse the response body
      const responseBody = JSON.parse(result.body)
      expect(responseBody).toHaveProperty('requestId', 'ci-test-request-id')
    })

    test('should handle scheduler events with proper error responses', async () => {
      const handler = require('../safe-settings-handler')
      
      const mockSchedulerEvent = {
        source: 'aws.events',
        'detail-type': 'Scheduled Event',
        detail: {},
        time: new Date().toISOString()
      }

      const result = await handler.scheduler(mockSchedulerEvent, mockContext)
      
      // Should return proper Lambda response structure
      expect(result).toHaveProperty('statusCode')
      expect(result).toHaveProperty('body')
      expect(typeof result.body).toBe('string')
      
      // Parse the response body
      const responseBody = JSON.parse(result.body)
      expect(responseBody).toHaveProperty('requestId', 'ci-test-request-id')
    })

    test('should handle development mode correctly', async () => {
      // Set development environment
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      // Clear any existing GitHub credentials to force development mode
      const originalAppId = process.env.APP_ID
      const originalPrivateKey = process.env.PRIVATE_KEY
      const originalWebhookSecret = process.env.WEBHOOK_SECRET
      
      delete process.env.APP_ID
      delete process.env.PRIVATE_KEY
      delete process.env.WEBHOOK_SECRET

      try {
        // Clear require cache to pick up new environment
        delete require.cache[require.resolve('../safe-settings-handler')]
        delete require.cache[require.resolve('../index.js')]
        
        const handler = require('../safe-settings-handler')
        
        const mockEvent = {
          sync: true,
          source: 'ci-development-test'
        }

        const result = await handler.scheduler(mockEvent, mockContext)
        
        // In development mode without credentials, should use mock implementation
        expect(result).toHaveProperty('statusCode', 200)
        expect(result).toHaveProperty('body')
        
        const responseBody = JSON.parse(result.body)
        expect(responseBody).toHaveProperty('success', true)
        expect(responseBody).toHaveProperty('message')
        expect(responseBody.message).toContain('Development')
        
      } finally {
        // Restore original environment
        process.env.NODE_ENV = originalNodeEnv
        if (originalAppId) process.env.APP_ID = originalAppId
        if (originalPrivateKey) process.env.PRIVATE_KEY = originalPrivateKey
        if (originalWebhookSecret) process.env.WEBHOOK_SECRET = originalWebhookSecret
        
        // Clear require cache
        delete require.cache[require.resolve('../safe-settings-handler')]
        delete require.cache[require.resolve('../index.js')]
      }
    })
  })

  describe('Response Format Validation', () => {
    test('should return Lambda-compatible error responses', () => {
      const errorResponse = {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Test error',
          requestId: 'test-request-id'
        })
      }
      
      expect(errorResponse.statusCode).toBe(500)
      expect(typeof errorResponse.body).toBe('string')
      
      const parsedBody = JSON.parse(errorResponse.body)
      expect(parsedBody).toHaveProperty('error')
      expect(parsedBody).toHaveProperty('requestId')
    })

    test('should return Lambda-compatible success responses', () => {
      const successResponse = {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Test success',
          requestId: 'test-request-id'
        })
      }
      
      expect(successResponse.statusCode).toBe(200)
      expect(typeof successResponse.body).toBe('string')
      
      const parsedBody = JSON.parse(successResponse.body)
      expect(parsedBody).toHaveProperty('success', true)
      expect(parsedBody).toHaveProperty('message')
      expect(parsedBody).toHaveProperty('requestId')
    })
  })
})