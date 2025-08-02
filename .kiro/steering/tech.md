# Technology Stack & Build System

## Runtime & Platform
- **Node.js**: Version 20+ (Latest LTS recommended for development, AWS Lambda runtime nodejs:20)
- **Platform**: AWS Lambda with Docker containers
- **Container Base**: `public.ecr.aws/lambda/nodejs:20`
- **Source Integration**: Uses official Safe Settings from `ghcr.io/github/safe-settings:2.1.17`
- **Template Repository**: Generic template for any organization deployment
- **Local Development**: Requires Node.js 20+ for Jest and modern JavaScript features

## Core Dependencies
- **@probot/adapter-aws-lambda-serverless**: ^4.0.3 - Lambda adapter for Probot framework
- **Safe Settings**: Official GitHub Safe Settings application (copied from container)

## Development Dependencies
- **Jest**: ^29.7.0 - Testing framework
- **@types/jest**: ^29.5.8 - TypeScript definitions for Jest
- **dotenv**: ^17.2.0 - Environment variable management

## Architecture Pattern
- **Handler Pattern**: Single Docker image with multiple entry points
  - `safe-settings-handler.webhooks` - GitHub webhook processing
  - `safe-settings-handler.scheduler` - Scheduled sync operations
- **Multi-stage Docker Build**: Copies Safe Settings source, adds Lambda adapter
- **Smart Routing**: Event-based routing between webhook and scheduler handlers
- **Development Mode**: Mock implementation when credentials unavailable

## Common Commands

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Test local Lambda simulation
npm run test:local

# Test webhook handler locally
npm run test:webhook

# Test scheduler handler locally  
npm run test:scheduler

# Test development mode
npm run test:dev
```

### Development
```bash
# Install dependencies
npm install

# Local development with environment variables
cp .env.example .env
# Edit .env with your GitHub App credentials
```

### Docker Operations
```bash
# Build Docker image locally
docker build -t safe-settings-lambda .

# Run webhook handler
docker run --env-file .env safe-settings-lambda safe-settings-handler.webhooks

# Run scheduler handler
docker run --env-file .env safe-settings-lambda safe-settings-handler.scheduler
```

### AWS Deployment
```bash
# Deploy via GitHub Actions (automatic on push to master)
git push origin master

# Manual Lambda function updates
aws lambda update-function-code --function-name FUNCTION_NAME --image-uri IMAGE_URI
aws lambda update-function-configuration --function-name FUNCTION_NAME --image-config '{"Command":["HANDLER"]}'
```

## Environment Configuration
- **Required for Production**: APP_ID, PRIVATE_KEY, WEBHOOK_SECRET
- **Optional**: SAFE_SETTINGS_GITHUB_CLIENT_ID, SAFE_SETTINGS_GITHUB_CLIENT_SECRET
- **Development**: NODE_ENV=development enables mock mode
- **Logging**: LOG_LEVEL controls verbosity (info, debug, error)

## CI/CD Pipeline
- **GitHub Actions**: Automated testing, building, and deployment
- **Multi-stage Testing**: Unit tests → Lambda simulation → Docker build → Security audit
- **Automated Deployment**: Push to master triggers production deployment
- **Environment Management**: Separate workflows for sandbox and production