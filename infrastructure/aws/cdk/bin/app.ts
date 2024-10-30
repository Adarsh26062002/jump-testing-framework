#!/usr/bin/env node

/**
 * AWS CDK Application Entry Point
 * Initializes and deploys all infrastructure stacks for the test framework.
 * 
 * Requirements addressed:
 * - Deployment Architecture (system_architecture.deployment_architecture)
 * - CI/CD Pipeline Integration (infrastructure.ci/cd_pipeline)
 */

// AWS CDK v2.0.0
import * as cdk from 'aws-cdk-lib';

// Import stack definitions
import { TestFrameworkStack } from '../lib/test-framework-stack';
import { DatabaseStack } from '../lib/database-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
import { PipelineStack } from '../lib/pipeline-stack';

/**
 * Main entry point for the AWS CDK application
 * Initializes and configures all infrastructure stacks
 */
const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
};

// Stack configuration
const stackConfig = {
  env,
  tags: {
    Project: 'TestFramework',
    Environment: process.env.ENVIRONMENT || 'development',
    ManagedBy: 'AWS-CDK'
  }
};

// Initialize stacks with dependencies
// Database stack must be created first as other stacks depend on it
const databaseStack = new DatabaseStack(app, 'TestFrameworkDatabaseStack', {
  ...stackConfig,
  description: 'Test Framework Database Infrastructure Stack'
});

// Monitoring stack depends on database metrics
const monitoringStack = new MonitoringStack(app, 'TestFrameworkMonitoringStack', {
  ...stackConfig,
  description: 'Test Framework Monitoring Infrastructure Stack'
});

// Pipeline stack depends on both database and monitoring
const pipelineStack = new PipelineStack(app, 'TestFrameworkPipelineStack', {
  ...stackConfig,
  description: 'Test Framework CI/CD Pipeline Infrastructure Stack'
});

// Main framework stack that integrates all components
const frameworkStack = new TestFrameworkStack(app, 'TestFrameworkMainStack', {
  ...stackConfig,
  description: 'Test Framework Main Infrastructure Stack'
});

// Add stack dependencies
monitoringStack.addDependency(databaseStack);
pipelineStack.addDependency(databaseStack);
pipelineStack.addDependency(monitoringStack);
frameworkStack.addDependency(databaseStack);
frameworkStack.addDependency(monitoringStack);
frameworkStack.addDependency(pipelineStack);

// Add stack references for cross-stack resources
frameworkStack.addPropertyOverride('DatabaseStackRef', databaseStack.stackName);
frameworkStack.addPropertyOverride('MonitoringStackRef', monitoringStack.stackName);
frameworkStack.addPropertyOverride('PipelineStackRef', pipelineStack.stackName);

// Configure stack termination protection for production
if (process.env.ENVIRONMENT === 'production') {
  cdk.Tags.of(app).add('Environment', 'production');
  
  // Enable termination protection for production stacks
  databaseStack.enableTerminationProtection();
  monitoringStack.enableTerminationProtection();
  pipelineStack.enableTerminationProtection();
  frameworkStack.enableTerminationProtection();
}

// Add context values for stack configuration
app.node.setContext('environment', process.env.ENVIRONMENT || 'development');
app.node.setContext('region', env.region);
app.node.setContext('account', env.account);

// Synthesize the app
app.synth();