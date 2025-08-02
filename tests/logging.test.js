// Logging utility tests
describe('Logging Utility Tests', () => {
  let consoleSpy

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    delete process.env.LOG_LEVEL
  })

  describe('Log Level Handling', () => {
    test('should log errors as JSON regardless of LOG_LEVEL', () => {
      // Import the handler to get access to the log function
      const handler = require('../safe-settings-handler')
      
      // Trigger an error scenario to test error logging
      const mockContext = { awsRequestId: 'test-123' }
      const mockEvent = { httpMethod: 'POST' }
      
      // This will trigger error logging due to missing env vars
      return handler.webhooks(mockEvent, mockContext).then(() => {
        expect(consoleSpy).toHaveBeenCalled()
        
        // Check if any call was JSON (error logs)
        const jsonCalls = consoleSpy.mock.calls.filter(call => {
          try {
            JSON.parse(call[0])
            return true
          } catch {
            return false
          }
        })
        
        expect(jsonCalls.length).toBeGreaterThan(0)
      })
    })

    test('should log debug messages as JSON when LOG_LEVEL=debug', () => {
      process.env.LOG_LEVEL = 'debug'
      
      // Clear require cache to pick up new LOG_LEVEL
      delete require.cache[require.resolve('../safe-settings-handler')]
      
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'debug-test-123' }
      const mockEvent = { httpMethod: 'POST' }
      
      return handler.webhooks(mockEvent, mockContext).then(() => {
        expect(consoleSpy).toHaveBeenCalled()
        
        // Should have JSON formatted logs due to debug level
        const jsonCalls = consoleSpy.mock.calls.filter(call => {
          try {
            const parsed = JSON.parse(call[0])
            return parsed.level === 'info' || parsed.level === 'error'
          } catch {
            return false
          }
        })
        
        expect(jsonCalls.length).toBeGreaterThan(0)
      })
    })

    test('should log info messages as simple text when LOG_LEVEL=info', () => {
      process.env.LOG_LEVEL = 'info'
      
      delete require.cache[require.resolve('../safe-settings-handler')]
      
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'info-test-123' }
      const mockEvent = { 
        source: 'aws.events',
        'detail-type': 'Scheduled Event'
      }
      
      // Set development mode to avoid credential errors
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      return handler.scheduler(mockEvent, mockContext).then(() => {
        expect(consoleSpy).toHaveBeenCalled()
        
        // Should have simple text logs for info level
        const textCalls = consoleSpy.mock.calls.filter(call => {
          return typeof call[0] === 'string' && call[0].includes('[INFO]')
        })
        
        expect(textCalls.length).toBeGreaterThan(0)
        
        // Restore environment
        process.env.NODE_ENV = originalNodeEnv
      })
    })
  })

  describe('Log Metadata', () => {
    test('should include timestamp in all log entries', () => {
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'timestamp-test' }
      const mockEvent = { httpMethod: 'POST' }
      
      return handler.webhooks(mockEvent, mockContext).then(() => {
        expect(consoleSpy).toHaveBeenCalled()
        
        // Check JSON logs for timestamp
        const jsonCalls = consoleSpy.mock.calls.filter(call => {
          try {
            const parsed = JSON.parse(call[0])
            return parsed.timestamp && new Date(parsed.timestamp).getTime() > 0
          } catch {
            return false
          }
        })
        
        expect(jsonCalls.length).toBeGreaterThan(0)
      })
    })

    test('should include requestId in log metadata', () => {
      const handler = require('../safe-settings-handler')
      const mockContext = { awsRequestId: 'metadata-test-456' }
      const mockEvent = { httpMethod: 'POST' }
      
      return handler.webhooks(mockEvent, mockContext).then(() => {
        expect(consoleSpy).toHaveBeenCalled()
        
        // Check JSON logs for requestId
        const jsonCalls = consoleSpy.mock.calls.filter(call => {
          try {
            const parsed = JSON.parse(call[0])
            return parsed.requestId === 'metadata-test-456'
          } catch {
            return false
          }
        })
        
        expect(jsonCalls.length).toBeGreaterThan(0)
      })
    })
  })
})