# Local Testing Guide

## Prerequisites

- **Node.js 20+ (Latest LTS recommended)** - Required for Jest and modern JavaScript features
- npm 10+ (comes with Node.js 20+)
- Docker (optional, for container testing)

## 🧪 Available Test Commands

### 1. **Unit Tests**
```bash
npm test                    # Run all Jest unit tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

### 2. **Local Lambda Simulation**
```bash
npm run test:local         # Test all handlers (shows error handling)
npm run test:webhook       # Test webhook handler only
npm run test:scheduler     # Test scheduler handler only
npm run test:dev          # Test development mode with mocks
```

## 🔧 Test Scenarios

### **Without GitHub Credentials (Default)**
When you don't have GitHub App credentials configured:

```bash
npm run test:local
```

**Expected Output:**
- ✅ **Error Handling**: Shows proper Lambda error responses
- ✅ **Logging**: Structured JSON logs with request IDs
- ✅ **Status Codes**: Returns 500 with proper error messages
- ✅ **Request Tracking**: Each request has unique ID for debugging

### **Development Mode Testing**
Test the mock implementation:

```bash
npm run test:dev
```

**Expected Output:**
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"message\":\"Development sync completed successfully\",\"result\":{\"success\":true,\"message\":\"Mock sync completed\",\"timestamp\":\"2025-07-15T05:23:23.469Z\",\"environment\":\"development\"},\"requestId\":\"dev-test-1752557002595\"}"
}
```

### **With Real GitHub Credentials**
For full testing with actual GitHub App:

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your GitHub App credentials to `.env.local`:**
   ```bash
   APP_ID=your-github-app-id
   PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   your-private-key-here
   -----END PRIVATE KEY-----"
   WEBHOOK_SECRET=your-webhook-secret
   ```

3. **Run tests:**
   ```bash
   npm run test:local
   ```

## 📊 What Each Test Validates

### **Unit Tests (`npm test`)**
- ✅ Module loading and exports
- ✅ File structure validation
- ✅ Handler function signatures
- ✅ Response format validation
- ✅ Development vs production logic
- ✅ **Logging utility validation** - Tests log levels, JSON formatting, and metadata
- ✅ **Environment variable handling** - Tests missing credentials scenarios
- ✅ **Event processing** - Tests webhook and scheduler event handling
- ✅ **Error handling and recovery** - Tests error scenarios and stack traces

### **Local Lambda Tests (`npm run test:local`)**
- ✅ **Error Handling**: Proper try/catch with Lambda responses
- ✅ **Logging**: Structured logs with timestamps and request IDs
- ✅ **Request Routing**: Different event types handled correctly
- ✅ **Status Codes**: 200 for success, 500 for errors
- ✅ **Response Format**: Proper JSON structure for Lambda

### **Development Mode (`npm run test:dev`)**
- ✅ **Mock Implementation**: Works without GitHub credentials
- ✅ **Environment Detection**: Correctly identifies development mode
- ✅ **Cache Handling**: Properly reloads modules in development
- ✅ **Success Responses**: Returns 200 with mock data

## 🔍 Understanding Test Output

### **Successful Error Handling (Expected)**
```json
{
  "statusCode": 500,
  "body": "{\"error\":\"Internal server error\",\"requestId\":\"local-test-123\"}"
}
```
This is **correct behavior** - the handler properly catches missing credentials and returns a Lambda-compatible error response.

### **Successful Development Mode**
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"message\":\"Development sync completed successfully\"}"
}
```
This shows the mock implementation working correctly.

### **Structured Logging**
```json
{
  "timestamp": "2025-07-15T05:23:23.469Z",
  "level": "info",
  "message": "🔄 Scheduler handler invoked",
  "requestId": "dev-test-1752557002595",
  "eventSource": "development-test"
}
```

## 🚀 Production Testing

### **Docker Build Test**
```bash
docker build -t safe-settings-lambda .
```

### **Lambda Function URL Test**
Once deployed to AWS, test with curl:

```bash
# Test webhook endpoint
curl -X POST https://your-lambda-url.lambda-url.us-east-1.on.aws/ \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{"zen": "Design for failure."}'

# Test scheduler via AWS CLI
aws lambda invoke \
  --function-name safe-settings-scheduler \
  --payload '{"source": "aws.events"}' \
  response.json
```

## 🐛 Troubleshooting

### **"appId option is required" Error**
This is **expected** when testing without GitHub App credentials. The error handling is working correctly.

### **Module Cache Issues**
If you see stale behavior, clear Node.js cache:
```bash
rm -rf node_modules/.cache
npm test
```

### **Environment Variables Not Loading**
Make sure your `.env.local` file is in the project root and properly formatted.

## 💡 Best Practices

1. **Always test error scenarios** - Most issues happen during error conditions
2. **Check request ID tracking** - Every response should have a unique request ID
3. **Validate response formats** - Lambda requires specific JSON structure
4. **Test both development and production modes** - Different code paths
5. **Monitor structured logs** - JSON logs are easier to parse in CloudWatch

## 🎯 What This Testing Validates

✅ **Production Readiness**: Proper error handling and Lambda responses  
✅ **Debugging Capability**: Request ID tracking and structured logging  
✅ **Development Experience**: Mock implementation for local development  
✅ **Error Recovery**: Graceful handling of missing credentials  
✅ **Response Consistency**: Proper JSON structure for all scenarios  

The refactored code handles both success and error scenarios properly, making it production-ready for AWS Lambda deployment.