# Product Overview

## Safe Settings AWS Lambda Template

This template repository provides a production-ready AWS Lambda deployment of GitHub Safe Settings - a tool for managing GitHub repository configurations at scale through code.

### Core Purpose
- **Repository Management**: Automatically apply and enforce repository settings across GitHub organizations
- **Configuration as Code**: Define repository configurations in YAML files that are version-controlled
- **Compliance Automation**: Ensure repositories meet organizational security and governance standards
- **Webhook Processing**: React to repository events in real-time to maintain configuration drift
- **Scheduled Sync**: Periodic synchronization to catch and correct any configuration drift

### Key Features
- **Dual Lambda Architecture**: Separate functions for webhook processing and scheduled operations
- **Docker Containerization**: Uses official Safe Settings source with Lambda adapter
- **Development Mode**: Mock implementation for local testing without external dependencies
- **Smart Routing**: Intelligent event handling between webhook and scheduler modes
- **Comprehensive Testing**: Unit tests, integration tests, and CI/CD validation

### Target Users
- DevOps teams managing multiple GitHub repositories
- Organizations requiring consistent repository governance
- Teams needing automated compliance enforcement
- Infrastructure teams deploying GitHub Apps at scale

### Business Value
- Reduces manual repository configuration overhead
- Ensures consistent security and compliance policies
- Provides audit trail for repository changes
- Scales repository management across large organizations