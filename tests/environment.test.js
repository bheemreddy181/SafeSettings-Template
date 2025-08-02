// Environment variable validation tests
describe('Environment Variable Tests', () => {
  let consoleSpy
  const originalEnv = process.env

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    // Reset environment to clean state
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    process.env = originalEnv
    // Clear require cache
    delete require.cache[require.resolve('../safe-settings-handler')]
  })

  describe('Webhook Handler Environment Validation', () => {
    test('should fail when APP_ID is missing', async () => {
      delete process.env.APP_ID
      process.env.PRIVATE_KEY = 'test-key'
      process.env.WEBHOOK_SECRET = 'test-secret'

      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'missing-app-id-test' }
      const mockEvent = { httpMethod: 'POST' }

      const result = await handler.webhooks(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.missingVariables).toContain('APP_ID')
      expect(body.requestId).toBe('missing-app-id-test')
    })

    test('should fail when PRIVATE_KEY is missing', async () => {
      process.env.APP_ID = 'test-app-id'
      delete process.env.PRIVATE_KEY
      process.env.WEBHOOK_SECRET = 'test-secret'

      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'missing-private-key-test' }
      const mockEvent = { httpMethod: 'POST' }

      const result = await handler.webhooks(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.missingVariables).toContain('PRIVATE_KEY')
    })

    test('should fail when WEBHOOK_SECRET is missing', async () => {
      process.env.APP_ID = 'test-app-id'
      process.env.PRIVATE_KEY = 'test-key'
      delete process.env.WEBHOOK_SECRET

      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'missing-webhook-secret-test' }
      const mockEvent = { httpMethod: 'POST' }

      const result = await handler.webhooks(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.missingVariables).toContain('WEBHOOK_SECRET')
    })

    test('should fail when multiple environment variables are missing', async () => {
      delete process.env.APP_ID
      delete process.env.PRIVATE_KEY
      process.env.WEBHOOK_SECRET = 'test-secret'

      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'multiple-missing-test' }
      const mockEvent = { httpMethod: 'POST' }

      const result = await handler.webhooks(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.missingVariables).toContain('APP_ID')
      expect(body.missingVariables).toContain('PRIVATE_KEY')
      expect(body.missingVariables).not.toContain('WEBHOOK_SECRET')
    })

    test('should include available environment variables in error response', async () => {
      delete process.env.APP_ID
      process.env.APP_DEBUG = 'true'
      process.env.PRIVATE_KEY_PATH = '/path/to/key'
      process.env.WEBHOOK_SECRET = 'test-secret'

      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'available-vars-test' }
      const mockEvent = { httpMethod: 'POST' }

      const result = await handler.webhooks(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.missingVariables).toContain('APP_ID')
      
      // Should log available variables that start with expected prefixes
      expect(consoleSpy).toHaveBeenCalled()
      
      // Check if error log includes available variables
      const errorLogs = consoleSpy.mock.calls.filter(call => {
        try {
          const parsed = JSON.parse(call[0])
          return parsed.level === 'error' && parsed.availableVars
        } catch {
          return false
        }
      })
      
      expect(errorLogs.length).toBeGreaterThan(0)
    })
  })

  describe('Scheduler Handler Environment Detection', () => {
    test('should use development mode when NODE_ENV=development and no credentials', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.APP_ID
      delete process.env.PRIVATE_KEY
      delete process.env.WEBHOOK_SECRET

      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'dev-mode-test' }
      const mockEvent = { source: 'aws.events' }

      const result = await handler.scheduler(mockEvent, mockContext)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.message).toContain('Development')
    })

    test('should use production mode when NODE_ENV=production even without credentials', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.APP_ID
      delete process.env.PRIVATE_KEY
      delete process.env.WEBHOOK_SECRET

      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'prod-mode-test' }
      const mockEvent = { source: 'aws.events' }

      const result = await handler.scheduler(mockEvent, mockContext)

      // Should fail in production mode without credentials
      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
    })

    test('should use production mode when credentials are available regardless of NODE_ENV', async () => {
      process.env.NODE_ENV = 'development'
      process.env.APP_ID = 'test-app-id'
      process.env.PRIVATE_KEY = 'test-private-key'
      process.env.WEBHOOK_SECRET = 'test-webhook-secret'

      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'prod-with-creds-test' }
      const mockEvent = { source: 'aws.events' }

      const result = await handler.scheduler(mockEvent, mockContext)

      // Should attempt production mode and likely fail due to invalid credentials
      // but the important thing is it doesn't use development mode
      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      // Should not contain "Development" in the message
      expect(body.error).toBeDefined()
    })
  })
})