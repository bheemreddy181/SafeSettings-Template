# Project Structure & Organization

## Template Repository Structure

This is a template repository for deploying Safe Settings to AWS Lambda. Use "Use this template" to create your own deployment.

## Root Level Files
- **safe-settings-handler.js** - Main Lambda handler with dual entry points (webhooks/scheduler)
- **index.js** - Mock Safe Settings implementation for development mode
- **Dockerfile** - Multi-stage build copying official Safe Settings source
- **package.json** - Dependencies and npm scripts configuration
- **local-test.js** - Local Lambda simulation for testing
- **test-dev-mode.js** - Development mode validation script

## Directory Structure

### `/tests/`
Test files following Jest conventions:
- **handler.test.js** - Handler module loading and response format tests
- **simple-integration.test.js** - Integration tests for module structure
- **ci-integration.test.js** - CI-specific integration validation

### `/.github/workflows/`
GitHub Actions CI/CD pipelines:
- **deploy-template.yml** - Template deployment workflow (copy and customize for your environment)
- **test.yml** - Testing and validation pipeline

### `/coverage/`
Generated test coverage reports (auto-generated, not version controlled)

### `/.kiro/steering/`
AI assistant steering rules:
- **product.md** - Product overview and business context
- **tech.md** - Technology stack and build system
- **structure.md** - Project organization (this file)

## File Naming Conventions
- **Handlers**: `*-handler.js` pattern for Lambda entry points
- **Tests**: `*.test.js` for Jest test files
- **Local Scripts**: `*-test.js` for local development utilities
- **Documentation**: `*.md` in UPPERCASE for major docs, lowercase for steering

## Code Organization Patterns

### Handler Architecture
- **Single Image, Multiple Handlers**: Same Docker container, different CMD
- **Smart Routing**: Event-based routing in handler functions
- **Error Handling**: Consistent error response format across handlers
- **Logging**: Structured logging with request ID tracking

### Testing Strategy
- **Unit Tests**: Core functionality validation
- **Integration Tests**: Module loading and structure validation
- **Local Simulation**: Lambda handler testing without AWS
- **CI Validation**: Automated testing in GitHub Actions

### Environment Management
- **Development Mode**: Mock implementations when credentials unavailable
- **Production Mode**: Full Safe Settings integration
- **Environment Detection**: Automatic mode switching based on available credentials

## Import/Export Patterns
- **CommonJS**: Using `require()` and `module.exports` throughout
- **Handler Exports**: Multiple named exports from main handler
- **Mock Implementations**: Conditional logic based on environment

## Configuration Files
- **.env.example** - Template for local environment variables
- **package.json** - npm configuration with custom scripts
- **Dockerfile** - Multi-stage build configuration
- **GitHub Workflows** - YAML-based CI/CD configuration

## Development Workflow
1. **Local Development**: Use mock mode with `NODE_ENV=development`
2. **Testing**: Run `npm test` for validation
3. **Docker Testing**: Build and test container locally
4. **CI Validation**: Push triggers automated testing
5. **Deployment**: Merge to master triggers production deployment

## Key Architectural Decisions
- **Monorepo Structure**: Single repository for all Lambda functions
- **Shared Container**: Same Docker image for multiple handlers
- **Official Source Integration**: Copies from official Safe Settings container
- **Zero External Dependencies**: Tests run without AWS/GitHub credentials
- **Comprehensive Documentation**: Multiple levels of documentation for different audiences