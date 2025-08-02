const {
  createLambdaFunction,
  createProbot
} = require('@probot/adapter-aws-lambda-serverless')

const appFn = require('./')

// Enhanced logging utility
function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString()
  const logLevel = process.env.LOG_LEVEL || 'info'

  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  }

  // Always log errors as JSON for better visibility
  // Also log debug level if LOG_LEVEL is debug
  if (level === 'error' || logLevel === 'debug') {
    console.log(JSON.stringify(logEntry))
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`)
  }
}

// Webhooks handler with error handling
module.exports.webhooks = async (event, context) => {
  try {
    log('info', '🔗 Webhook handler invoked', {
      requestId: context.awsRequestId,
      eventSource: 'github-webhook'
    })

    // Validate required environment variables
    const requiredEnvVars = ['APP_ID', 'PRIVATE_KEY', 'WEBHOOK_SECRET']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

    if (missingVars.length > 0) {
      log('error', '❌ Missing required environment variables', {
        requestId: context.awsRequestId,
        missingVariables: missingVars,
        availableVars: Object.keys(process.env).filter(key => key.startsWith('APP_') || key.startsWith('PRIVATE_') || key.startsWith('WEBHOOK_'))
      })

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Missing required environment variables',
          missingVariables: missingVars,
          requestId: context.awsRequestId
        })
      }
    }

    const lambdaFunction = createLambdaFunction(appFn, {
      probot: createProbot()
    })

    const result = await lambdaFunction(event, context)

    log('info', '✅ Webhook handler completed successfully', {
      requestId: context.awsRequestId
    })

    return result

  } catch (error) {
    log('error', '❌ Webhook handler failed', {
      requestId: context.awsRequestId,
      error: error.message,
      stack: error.stack
    })

    // Return proper Lambda error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        requestId: context.awsRequestId
      })
    }
  }
}

// Scheduler handler with proper async/await and error handling
module.exports.scheduler = async (event, context) => {
  try {
    log('info', '🔄 Scheduler handler invoked', {
      requestId: context.awsRequestId,
      eventSource: event.source || 'manual',
      eventDetailType: event['detail-type'] || 'unknown'
    })

    // Check if we're in development mode and can use mock
    const isDevelopment = process.env.NODE_ENV === 'development'
    const hasCredentials = process.env.APP_ID && process.env.PRIVATE_KEY && process.env.WEBHOOK_SECRET

    if (isDevelopment && !hasCredentials) {
      // Use mock implementation directly
      log('info', '🧪 Using development mode with mock implementation', {
        requestId: context.awsRequestId
      })

      // Re-require the app function to ensure we get the development version
      delete require.cache[require.resolve('./index.js')]
      const devAppFn = require('./index.js')
      const app = devAppFn({}, {}) // Pass empty objects for mock mode
      const result = await app.syncInstallation()

      log('info', '✅ Development scheduler completed successfully', {
        requestId: context.awsRequestId,
        result: result
      })

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Development sync completed successfully',
          result: result,
          requestId: context.awsRequestId
        })
      }
    } else {
      // Use real Probot implementation
      const probot = createProbot()
      const app = appFn(probot, {})

      // Ensure syncInstallation is awaited properly
      const result = await app.syncInstallation()

      log('info', '✅ Scheduler handler completed successfully', {
        requestId: context.awsRequestId
      })

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Sync completed successfully',
          result: result,
          requestId: context.awsRequestId
        })
      }
    }

  } catch (error) {
    log('error', '❌ Scheduler handler failed', {
      requestId: context.awsRequestId,
      error: error.message,
      stack: error.stack
    })

    // Don't throw - return error response for Lambda
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        requestId: context.awsRequestId
      })
    }
  }
}
