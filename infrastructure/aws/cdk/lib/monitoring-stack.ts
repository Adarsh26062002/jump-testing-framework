/**
 * AWS CDK Stack for Monitoring Infrastructure
 * Implements comprehensive monitoring and alerting for the test framework infrastructure.
 * 
 * Requirements addressed:
 * - Infrastructure Monitoring (infrastructure.infrastructure_monitoring)
 * - Component Monitoring and Metrics
 */

// AWS CDK v2.0.0
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';  // v10.0.0
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';  // v2.0.0
import * as sns from '@aws-cdk/aws-sns';  // v2.0.0
import * as codepipeline from '@aws-cdk/aws-codepipeline';  // v2.0.0
import * as rds from '@aws-cdk/aws-rds';

// Import database stack for monitoring database resources
import { DatabaseStack } from './database-stack';

/**
 * MonitoringStack class for setting up comprehensive monitoring infrastructure
 * Implements the monitoring requirements from the technical specification
 */
export class MonitoringStack extends cdk.Stack {
  // Public properties for cross-stack references
  public readonly mainDashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;
  private readonly pipelineMetrics: cloudwatch.Metric[];

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Initialize SNS topic for alarms
    this.setupNotifications();

    // Initialize CloudWatch dashboard
    this.mainDashboard = new cloudwatch.Dashboard(this, 'TestFrameworkDashboard', {
      dashboardName: 'TestFramework-Monitoring',
    });

    // Initialize pipeline metrics array
    this.pipelineMetrics = [];

    // Set up all monitoring components
    this.setupDashboards();
    this.setupPipelineMonitoring();
    this.setupAlarms();

    // Add tags for resource management
    cdk.Tags.of(this).add('Environment', props?.env?.region || 'dev');
    cdk.Tags.of(this).add('Service', 'TestFramework-Monitoring');
  }

  /**
   * Sets up CloudWatch dashboards for all components
   * Implements monitoring visualization requirements
   */
  private setupDashboards(): void {
    // Database Metrics Widget
    this.mainDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Database Metrics',
        left: [
          this.getDatabaseMetric('CPUUtilization', 'EventsDB'),
          this.getDatabaseMetric('CPUUtilization', 'InventoryDB'),
        ],
        right: [
          this.getDatabaseMetric('FreeableMemory', 'EventsDB'),
          this.getDatabaseMetric('FreeableMemory', 'InventoryDB'),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Database Connections',
        left: [
          this.getDatabaseMetric('DatabaseConnections', 'EventsDB'),
          this.getDatabaseMetric('DatabaseConnections', 'InventoryDB'),
        ],
        width: 12,
      })
    );

    // Test Runner Metrics Widget
    this.mainDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Test Runner Performance',
        left: [
          this.getTestRunnerMetric('TestExecutionTime'),
          this.getTestRunnerMetric('TestSuccessRate'),
        ],
        right: [
          this.getTestRunnerMetric('ResourceUtilization'),
          this.getTestRunnerMetric('ConcurrentTests'),
        ],
        width: 12,
      })
    );

    // API Integration Metrics Widget
    this.mainDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Integration Metrics',
        left: [
          this.getApiMetric('ResponseTime'),
          this.getApiMetric('ErrorRate'),
        ],
        right: [
          this.getApiMetric('RequestCount'),
          this.getApiMetric('SuccessRate'),
        ],
        width: 12,
      })
    );
  }

  /**
   * Sets up pipeline monitoring metrics and alarms
   * Implements CI/CD pipeline monitoring requirements
   */
  private setupPipelineMonitoring(): void {
    // Pipeline execution metrics
    const pipelineSuccessMetric = new cloudwatch.Metric({
      namespace: 'TestFramework/Pipeline',
      metricName: 'ExecutionSuccess',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const pipelineDurationMetric = new cloudwatch.Metric({
      namespace: 'TestFramework/Pipeline',
      metricName: 'ExecutionDuration',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    this.pipelineMetrics.push(pipelineSuccessMetric, pipelineDurationMetric);

    // Add pipeline metrics to dashboard
    this.mainDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Pipeline Metrics',
        left: [pipelineSuccessMetric],
        right: [pipelineDurationMetric],
        width: 12,
      })
    );
  }

  /**
   * Sets up CloudWatch alarms for critical metrics
   * Implements alerting requirements for infrastructure monitoring
   */
  private setupAlarms(): void {
    // Database CPU Utilization Alarms
    new cloudwatch.Alarm(this, 'EventsDbCpuAlarm', {
      metric: this.getDatabaseMetric('CPUUtilization', 'EventsDB'),
      threshold: 80,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      alarmDescription: 'Events Database CPU utilization is high',
      actionsEnabled: true,
      alarmName: 'EventsDB-HighCPU',
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));

    // Test Runner Alarms
    new cloudwatch.Alarm(this, 'TestExecutionTimeAlarm', {
      metric: this.getTestRunnerMetric('TestExecutionTime'),
      threshold: 300, // 5 minutes
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Test execution time is exceeding threshold',
      actionsEnabled: true,
      alarmName: 'TestRunner-HighExecutionTime',
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));

    // API Integration Alarms
    new cloudwatch.Alarm(this, 'ApiErrorRateAlarm', {
      metric: this.getApiMetric('ErrorRate'),
      threshold: 5, // 5% error rate
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'API error rate is above threshold',
      actionsEnabled: true,
      alarmName: 'API-HighErrorRate',
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));

    // Pipeline Alarms
    new cloudwatch.Alarm(this, 'PipelineFailureAlarm', {
      metric: this.pipelineMetrics[0], // Pipeline success metric
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: 'Pipeline execution failed',
      actionsEnabled: true,
      alarmName: 'Pipeline-ExecutionFailure',
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  /**
   * Sets up SNS topics for notifications
   * Implements notification requirements for monitoring alerts
   */
  private setupNotifications(): void {
    this.alarmTopic = new sns.Topic(this, 'MonitoringAlarmTopic', {
      topicName: 'TestFramework-Monitoring-Alerts',
      displayName: 'Test Framework Monitoring Alerts',
    });

    // Add subscription for email notifications
    new sns.Subscription(this, 'EmailSubscription', {
      topic: this.alarmTopic,
      protocol: sns.SubscriptionProtocol.EMAIL,
      endpoint: process.env.ALERT_EMAIL || 'alerts@testframework.com',
    });
  }

  /**
   * Helper method to create database metrics
   */
  private getDatabaseMetric(metricName: string, dbIdentifier: string): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName,
      dimensionsMap: {
        DBInstanceIdentifier: dbIdentifier,
      },
      period: cdk.Duration.minutes(1),
    });
  }

  /**
   * Helper method to create test runner metrics
   */
  private getTestRunnerMetric(metricName: string): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace: 'TestFramework/TestRunner',
      metricName,
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
    });
  }

  /**
   * Helper method to create API metrics
   */
  private getApiMetric(metricName: string): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace: 'TestFramework/API',
      metricName,
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
    });
  }
}