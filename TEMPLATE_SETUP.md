# Safe Settings AWS Lambda Template Setup Guide

This repository is a template for deploying GitHub Safe Settings to AWS Lambda. Follow this guide to set up your own deployment.

## 🚀 Quick Start

### Prerequisites

Before starting, ensure you have:

- AWS Account with ECR and Lambda access
- GitHub repository with Actions enabled
- **Node.js 20+ (Latest LTS recommended)** for local development and testing
- npm 10+ (comes with Node.js 20+)
- Docker installed for local container testing

### 1. Create Repository from Template

1. Click "Use this template" button on GitHub
2. Create a new repository in your organization
3. Clone your new repository locally

### 2. Configure GitHub Repository

#### Repository Variables
Go to Settings → Secrets and variables → Actions → Variables tab:

```
AWS_REGION=us-east-1                    # Your AWS region
AWS_ACCOUNT_ID=123456789012             # Your AWS account ID
ECR_REPOSITORY=safe-settings-lambda     # Your ECR repository name
LAMBDA_FUNCTION_NAME=safe-settings-lambda        # Webhook Lambda function name
SCHEDULER_FUNCTION_NAME=safe-settings-scheduler  # Scheduler Lambda function name
GH_ORG=your-organization                # Your GitHub organization
APP_ID=123456                           # Your GitHub App ID
WEBHOOK_SECRET=your-webhook-secret      # Your GitHub App webhook secret
SAFE_SETTINGS_GITHUB_CLIENT_ID=your-client-id    # GitHub App client ID (optional)
```

#### Repository Secrets
Go to Settings → Secrets and variables → Actions → Secrets tab:

```
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...  # Your GitHub App private key
SAFE_SETTINGS_GITHUB_CLIENT_SECRET=your-secret  # GitHub App client secret (optional)
```

### 3. Set Up AWS Resources

#### Create ECR Repository
```bash
aws ecr create-repository \
  --repository-name safe-settings-lambda \
  --region YOUR_AWS_REGION
```

#### Create IAM Role for GitHub Actions
```bash
# First, create the OIDC provider if it doesn't exist
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# Create the role
aws iam create-role \
  --role-name safe-settings-github-deploy-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRole",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
          }
        }
      }
    ]
  }'

# Attach necessary policies
aws iam attach-role-policy \
  --role-name safe-settings-github-deploy-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-role-policy \
  --role-name safe-settings-github-deploy-role \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess
```

#### Create Lambda Functions
```bash
# Create webhook Lambda function
aws lambda create-function \
  --function-name safe-settings-lambda \
  --code ImageUri=YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/safe-settings-lambda:latest \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --package-type Image \
  --timeout 30 \
  --memory-size 512 \
  --image-config '{"Command":["safe-settings-handler.webhooks"]}'

# Create scheduler Lambda function
aws lambda create-function \
  --function-name safe-settings-scheduler \
  --code ImageUri=YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/safe-settings-lambda:latest \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --package-type Image \
  --timeout 60 \
  --memory-size 512 \
  --image-config '{"Command":["safe-settings-handler.scheduler"]}'

# Create Function URL for webhooks
aws lambda create-function-url-config \
  --function-name safe-settings-lambda \
  --auth-type NONE \
  --cors '{"AllowOrigins":["*"],"AllowMethods":["POST"]}'
```

### 4. Set Up Deployment Workflow

1. Copy `.github/workflows/deploy-template.yml` to `.github/workflows/deploy-production.yml`
2. Update the placeholders in your new deployment file:

```yaml
# Replace these values in deploy-production.yml:
environment: production                    # Your environment name
ECR_ADDRESS: YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
ECR_REPOSITORY: YOUR_ECR_REPOSITORY_NAME
LAMBDA_FUNCTION_NAME: YOUR_WEBHOOKS_FUNCTION_NAME
SCHEDULER_FUNCTION_NAME: YOUR_SCHEDULER_FUNCTION_NAME
ROLE_TO_ASSUME: arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_DEPLOY_ROLE
AWS_REGION: YOUR_AWS_REGION
```

### 5. Create GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Configure:
   - **App name**: Your Safe Settings App
   - **Homepage URL**: Your organization URL
   - **Webhook URL**: Your Lambda Function URL from step 3
   - **Webhook secret**: Generate a secure secret
   - **Permissions**: Repository permissions for administration, contents, metadata, pull requests, etc.
   - **Subscribe to events**: Repository, push, pull request, etc.

4. Generate and download the private key
5. Note the App ID and Client ID

### 6. Deploy

1. Push your changes to the main branch:
```bash
git add .
git commit -m "Configure Safe Settings deployment"
git push origin main
```

2. The GitHub Actions workflow will automatically:
   - Run tests
   - Build Docker image
   - Push to ECR
   - Update Lambda functions
   - Configure environment variables

### 7. Configure Safe Settings

1. Create a `.github/safe-settings.yml` file in your repositories or organization
2. Define your repository settings according to [Safe Settings documentation](https://github.com/github/safe-settings)

Example:
```yaml
# .github/safe-settings.yml
repository:
  name: my-repo
  description: "My repository"
  private: false
  has_issues: true
  has_projects: false
  has_wiki: false
  default_branch: main

branches:
  - name: main
    protection:
      required_status_checks:
        strict: true
        contexts: ["test"]
      enforce_admins: false
      required_pull_request_reviews:
        required_approving_review_count: 1
        dismiss_stale_reviews: true
      restrictions: null
```

## 🔧 Customization

### Environment-Specific Deployments

Create multiple deployment workflows for different environments:

1. Copy `deploy-template.yml` to `deploy-staging.yml`, `deploy-production.yml`, etc.
2. Update environment names and AWS resources accordingly
3. Use GitHub environments to control deployments

### Monitoring and Logging

Set up CloudWatch monitoring:

```bash
# Create log groups
aws logs create-log-group --log-group-name /aws/lambda/safe-settings-lambda
aws logs create-log-group --log-group-name /aws/lambda/safe-settings-scheduler

# Set retention policy
aws logs put-retention-policy \
  --log-group-name /aws/lambda/safe-settings-lambda \
  --retention-in-days 30
```

### Scheduled Sync

Set up EventBridge for periodic syncs:

```bash
# Create EventBridge rule
aws events put-rule \
  --name safe-settings-sync-schedule \
  --schedule-expression "rate(5 minutes)"

# Add Lambda target
aws events put-targets \
  --rule safe-settings-sync-schedule \
  --targets "Id"="1","Arn"="arn:aws:lambda:YOUR_REGION:YOUR_ACCOUNT:function:safe-settings-scheduler"

# Grant permission
aws lambda add-permission \
  --function-name safe-settings-scheduler \
  --statement-id allow-eventbridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:YOUR_REGION:YOUR_ACCOUNT:rule/safe-settings-sync-schedule
```

## 🐛 Troubleshooting

### Common Issues

1. **Docker build fails**: Ensure Docker is installed and running
2. **AWS permissions**: Verify IAM roles have correct policies
3. **GitHub App setup**: Check webhook URL and permissions
4. **Environment variables**: Verify all secrets and variables are set

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in Lambda environment variables.

### Testing Locally

```bash
# Install dependencies
npm install

# Run tests
npm test

# Test with mock data
npm run test:dev
```

## 📚 Additional Resources

- [Safe Settings Documentation](https://github.com/github/safe-settings)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review CloudWatch logs for Lambda functions
3. Check GitHub Actions workflow logs
4. Open an issue in the original template repository