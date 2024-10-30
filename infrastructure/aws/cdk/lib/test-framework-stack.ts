/**
 * AWS CDK Stack for Test Framework Infrastructure
 * Integrates database, monitoring, and CI/CD pipeline components to support automated testing.
 * 
 * Requirements addressed:
 * - Deployment Architecture (system_architecture.deployment_architecture)
 * - CI/CD Pipeline Integration (infrastructure.ci/cd_pipeline)
 * - Infrastructure Monitoring (infrastructure.infrastructure_monitoring)
 */

// AWS CDK v2.0.0
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';  // v10.0.0
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as sns from '@aws-cdk/aws-sns';
import * as codepipeline from '@aws-cdk/aws-codepipeline';

// Import dependent stacks
import { DatabaseStack } from './database-stack';
import { MonitoringStack } from './monitoring-stack';
import { PipelineStack } from './pipeline-stack';

/**
 * TestFrameworkStack class that integrates all infrastructure components
 * Implements the core infrastructure requirements from the technical specification
 */
export class TestFrameworkStack extends cdk.Stack {
  // Public properties as required by the specification
  public readonly vpc: ec2.IVpc;
  public readonly eventsDb: rds.DatabaseInstance;
  public readonly inventoryDb: rds.DatabaseInstance;
  public readonly mainDashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;
  public readonly deploymentPipeline: codepipeline.Pipeline;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Initialize dependent stacks
    const databaseStack = new DatabaseStack(this, 'DatabaseStack', props);
    const monitoringStack = new MonitoringStack(this, 'MonitoringStack', props);
    const pipelineStack = new PipelineStack(this, 'PipelineStack', props);

    // Set up cross-stack references
    this.setupDatabaseIntegration(databaseStack);
    this.setupMonitoring(monitoringStack);
    this.setupCICDPipeline(pipelineStack);

    // Add tags for resource management
    cdk.Tags.of(this).add('Environment', props?.env?.region || 'dev');
    cdk.Tags.of(this).add('Service', 'TestFramework');
  }

  /**
   * Configures database integration for the test framework
   * Implements database integration requirements from system_architecture.database_integration_layer
   */
  private setupDatabaseIntegration(databaseStack: DatabaseStack): void {
    // Reference VPC and database instances from DatabaseStack
    this.vpc = databaseStack.vpc;
    this.eventsDb = databaseStack.eventsDb;
    this.inventoryDb = databaseStack.inventoryDb;

    // Create CloudWatch alarms for database health
    new cloudwatch.Alarm(this, 'EventsDbConnectionAlarm', {
      metric: this.eventsDb.metricDatabaseConnections(),
      threshold: 100,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      alarmDescription: 'Events Database connection count is high',
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));

    new cloudwatch.Alarm(this, 'InventoryDbConnectionAlarm', {
      metric: this.inventoryDb.metricDatabaseConnections(),
      threshold: 100,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      alarmDescription: 'Inventory Database connection count is high',
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));

    // Add database endpoints to SSM Parameter Store for easy access
    new cdk.aws_ssm.StringParameter(this, 'EventsDbEndpoint', {
      parameterName: '/test-framework/events-db-endpoint',
      stringValue: this.eventsDb.instanceEndpoint.hostname,
      description: 'Events Database endpoint',
    });

    new cdk.aws_ssm.StringParameter(this, 'InventoryDbEndpoint', {
      parameterName: '/test-framework/inventory-db-endpoint',
      stringValue: this.inventoryDb.instanceEndpoint.hostname,
      description: 'Inventory Database endpoint',
    });
  }

  /**
   * Configures monitoring for the test framework
   * Implements monitoring requirements from infrastructure.infrastructure_monitoring
   */
  private setupMonitoring(monitoringStack: MonitoringStack): void {
    // Reference monitoring resources from MonitoringStack
    this.mainDashboard = monitoringStack.mainDashboard;
    this.alarmTopic = monitoringStack.alarmTopic;

    // Add test framework specific widgets to main dashboard
    this.mainDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Test Framework Overview',
        left: [
          new cloudwatch.Metric({
            namespace: 'TestFramework',
            metricName: 'ActiveTests',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: 'TestFramework',
            metricName: 'TestExecutionTime',
            statistic: 'Average',
            period: cdk.Duration.minutes(1),
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Test Framework Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'TestFramework',
            metricName: 'TestFailures',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'TestFramework',
            metricName: 'InfrastructureErrors',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      })
    );

    // Set up test framework specific alarms
    new cloudwatch.Alarm(this, 'HighTestFailureRate', {
      metric: new cloudwatch.Metric({
        namespace: 'TestFramework',
        metricName: 'TestFailureRate',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10, // 10% failure rate
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Test failure rate is above threshold',
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  /**
   * Configures the CI/CD pipeline for the test framework
   * Implements pipeline requirements from infrastructure.ci/cd_pipeline
   */
  private setupCICDPipeline(pipelineStack: PipelineStack): void {
    // Reference pipeline from PipelineStack
    this.deploymentPipeline = pipelineStack.deploymentPipeline;

    // Add test framework specific pipeline metrics
    new cloudwatch.Metric({
      namespace: 'TestFramework/Pipeline',
      metricName: 'DeploymentSuccess',
      dimensions: {
        Pipeline: this.deploymentPipeline.pipelineName,
      },
    });

    new cloudwatch.Metric({
      namespace: 'TestFramework/Pipeline',
      metricName: 'DeploymentDuration',
      dimensions: {
        Pipeline: this.deploymentPipeline.pipelineName,
      },
    });

    // Set up pipeline notifications for test framework specific events
    const pipelineRule = new cdk.aws_events.Rule(this, 'TestFrameworkPipelineRule', {
      eventPattern: {
        source: ['aws.codepipeline'],
        detailType: ['CodePipeline Pipeline Execution State Change'],
        detail: {
          pipeline: [this.deploymentPipeline.pipelineName],
          state: ['FAILED', 'SUCCEEDED'],
        },
      },
    });

    pipelineRule.addTarget(new cdk.aws_events_targets.SnsTopic(this.alarmTopic, {
      message: cdk.aws_events.RuleTargetInput.fromText(
        'Test Framework Pipeline execution ' +
        cdk.aws_events.EventField.fromPath('$.detail.state') +
        ' for pipeline: ' +
        cdk.aws_events.EventField.fromPath('$.detail.pipeline')
      ),
    }));

    // Add pipeline status to dashboard
    this.mainDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Pipeline Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CodePipeline',
            metricName: 'SuccessRate',
            dimensions: {
              PipelineName: this.deploymentPipeline.pipelineName,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(60),
          }),
        ],
        width: 12,
      })
    );
  }
}