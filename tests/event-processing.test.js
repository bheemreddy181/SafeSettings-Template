// Event processing and error handling tests
describe('Event Processing Tests', () => {
  let consoleSpy
  const originalEnv = process.env

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    process.env = originalEnv
    delete require.cache[require.resolve('../safe-settings-handler')]
    delete require.cache[require.resolve('../index.js')]
  })

  describe('Webhook Event Processing', () => {
    test('should log webhook invocation with proper metadata', async () => {
      const handler = require('../safe-settings-handler')
      const mockContext = { 
        awsRequestId: 'webhook-logging-test',
        functionName: 'test-function'
      }
      const mockEvent = { 
        httpMethod: 'POST',
        headers: {
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-123'
        }
      }

      await handler.webhooks(mockEvent, mockContext)

      expect(consoleSpy).toHaveBeenCalled()
      
      // Check for webhook invocation log
      const invocationLogs = consoleSpy.mock.calls.filter(call => {
        try {
          const parsed = JSON.parse(call[0])
          return parsed.message && parsed.message.includes('Webhook handler invoked')
        } catch {
          return call[0].includes('Webhook handler invoked')
        }
      })
      
      expect(invocationLogs.length).toBeGreaterThan(0)
    })

    test('should handle different GitHub event types', async () => {
      const eventTypes = ['push', 'pull_request', 'issues', 'repository']
      
      for (const eventType of eventTypes) {
        const handler = require('../safe-settings-handler')
        const mockContext = { awsRequestId: `${eventType}-test` }
        const mockEvent = { 
          httpMethod: 'POST',
          headers: {
            'x-github-event': eventType,
            'x-github-delivery': `${eventType}-delivery`
          },
          body: JSON.stringify({ action: 'opened' })
        }

        const result = await handler.webhooks(mockEvent, mockContext)
        
        // Should return proper error response due to missing credentials
        expect(result.statusCode).toBe(500)
        expect(result.body).toBeDefined()
        
        const body = JSON.parse(result.body)
        expect(body.requestId).toBe(`${eventType}-test`)
      }
    })
  })

  describe('Scheduler Event Processing', () => {
    test('should log scheduler invocation with event metadata', async () => {
      process.env.NODE_ENV = 'development'
      
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'scheduler-logging-test' }
      const mockEvent = { 
        source: 'aws.events',
        'detail-type': 'Scheduled Event',
        detail: { scheduledTime: '2025-01-01T00:00:00Z' }
      }

      await handler.scheduler(mockEvent, mockContext)

      expect(consoleSpy).toHaveBeenCalled()
      
      // Check for scheduler invocation log with metadata
      const invocationLogs = consoleSpy.mock.calls.filter(call => {
        try {
          const parsed = JSON.parse(call[0])
          return parsed.message && parsed.message.includes('Scheduler handler invoked') &&
                 parsed.eventSource === 'aws.events' &&
                 parsed.eventDetailType === 'Scheduled Event'
        } catch {
          return call[0].includes('Scheduler handler invoked')
        }
      })
      
      expect(invocationLogs.length).toBeGreaterThan(0)
    })

    test('should handle manual sync events', async () => {
      process.env.NODE_ENV = 'development'
      
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'manual-sync-test' }
      const mockEvent = { 
        sync: true,
        source: 'manual-trigger'
      }

      const result = await handler.scheduler(mockEvent, mockContext)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.requestId).toBe('manual-sync-test')
    })

    test('should handle EventBridge scheduled events', async () => {
      process.env.NODE_ENV = 'development'
      
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'eventbridge-test' }
      const mockEvent = { 
        source: 'aws.events',
        'detail-type': 'Scheduled Event',
        time: new Date().toISOString(),
        region: 'us-east-1'
      }

      const result = await handler.scheduler(mockEvent, mockContext)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.message).toContain('Development')
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should catch and handle webhook processing errors', async () => {
      // Set up environment to trigger an error in webhook processing
      process.env.APP_ID = 'invalid-app-id'
      process.env.PRIVATE_KEY = 'invalid-private-key'
      process.env.WEBHOOK_SECRET = 'test-secret'
      
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'webhook-error-test' }
      const mockEvent = { 
        httpMethod: 'POST',
        headers: {
          'x-github-event': 'push',
          'x-hub-signature-256': 'invalid-signature'
        },
        body: JSON.stringify({ invalid: 'payload' })
      }

      const result = await handler.webhooks(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Internal server error')
      expect(body.requestId).toBe('webhook-error-test')
      
      // Should log error with stack trace
      const errorLogs = consoleSpy.mock.calls.filter(call => {
        try {
          const parsed = JSON.parse(call[0])
          return parsed.level === 'error' && parsed.message.includes('Webhook handler failed')
        } catch {
          return false
        }
      })
      
      expect(errorLogs.length).toBeGreaterThan(0)
    })

    test('should catch and handle scheduler processing errors', async () => {
      // Force production mode with invalid credentials to trigger error
      process.env.NODE_ENV = 'production'
      process.env.APP_ID = 'invalid-app-id'
      process.env.PRIVATE_KEY = 'invalid-private-key'
      process.env.WEBHOOK_SECRET = 'test-secret'
      
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'scheduler-error-test' }
      const mockEvent = { source: 'aws.events' }

      const result = await handler.scheduler(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.requestId).toBe('scheduler-error-test')
      
      // Should log error with stack trace
      const errorLogs = consoleSpy.mock.calls.filter(call => {
        try {
          const parsed = JSON.parse(call[0])
          return parsed.level === 'error' && parsed.message.includes('Scheduler handler failed')
        } catch {
          return false
        }
      })
      
      expect(errorLogs.length).toBeGreaterThan(0)
    })

    test('should include error details in logs', async () => {
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'error-details-test' }
      const mockEvent = { httpMethod: 'POST' }

      await handler.webhooks(mockEvent, mockContext)

      // Check for error logs with error details
      const errorLogs = consoleSpy.mock.calls.filter(call => {
        try {
          const parsed = JSON.parse(call[0])
          return parsed.level === 'error' && (parsed.error || parsed.missingVariables)
        } catch {
          return false
        }
      })
      
      expect(errorLogs.length).toBeGreaterThan(0)
    })
  })

  describe('Response Format Consistency', () => {
    test('should return consistent error response format across handlers', async () => {
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'consistency-test' }
      
      // Test webhook error response
      const webhookResult = await handler.webhooks({ httpMethod: 'POST' }, mockContext)
      expect(webhookResult).toHaveProperty('statusCode', 500)
      expect(webhookResult).toHaveProperty('body')
      
      const webhookBody = JSON.parse(webhookResult.body)
      expect(webhookBody).toHaveProperty('requestId', 'consistency-test')
      
      // Test scheduler error response (force error with production mode)
      process.env.NODE_ENV = 'production'
      delete require.cache[require.resolve('../safe-settings-handler')]
      
      const handler2 = require('../safe-settings-handler')
      const schedulerResult = await handler2.scheduler({ source: 'aws.events' }, mockContext)
      
      expect(schedulerResult).toHaveProperty('statusCode', 500)
      expect(schedulerResult).toHaveProperty('body')
      
      const schedulerBody = JSON.parse(schedulerResult.body)
      expect(schedulerBody).toHaveProperty('requestId', 'consistency-test')
      
      // Both should have consistent structure
      expect(typeof webhookBody.requestId).toBe('string')
      expect(typeof schedulerBody.requestId).toBe('string')
    })

    test('should return consistent success response format', async () => {
      process.env.NODE_ENV = 'development'
      
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'success-format-test' }
      const mockEvent = { source: 'aws.events' }

      const result = await handler.scheduler(mockEvent, mockContext)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      
      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('message')
      expect(body).toHaveProperty('result')
      expect(body).toHaveProperty('requestId', 'success-format-test')
      
      expect(typeof body.message).toBe('string')
      expect(typeof body.result).toBe('object')
    })
  })
})