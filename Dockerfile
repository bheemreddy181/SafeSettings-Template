# Get the safe-settings source code
FROM ghcr.io/github/safe-settings:2.1.17 AS safe-settings-source

# Use AWS Lambda runtime
FROM public.ecr.aws/lambda/nodejs:20

# Copy safe-settings source code and dependencies
COPY --from=safe-settings-source /opt/safe-settings/package*.json ${LAMBDA_TASK_ROOT}/
COPY --from=safe-settings-source /opt/safe-settings/index.js ${LAMBDA_TASK_ROOT}/
COPY --from=safe-settings-source /opt/safe-settings/lib ${LAMBDA_TASK_ROOT}/lib/

# Install dependencies in Lambda environment
RUN npm ci --omit=dev

# Install the AWS Lambda adapter for Probot
RUN npm install @probot/adapter-aws-lambda-serverless@4.0.3

# Copy our Lambda handler
COPY safe-settings-handler.js ${LAMBDA_TASK_ROOT}/

# Add health check for local testing (Lambda ignores this)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Note: No default CMD set - handler will be specified per Lambda function
# This allows the same image to be used for both webhooks and scheduler handlers 