/**
 * AWS CDK Stack for Database Infrastructure
 * Implements secure and scalable RDS instances for events and inventory databases.
 * 
 * Requirements addressed:
 * - Database Integration Layer (system_architecture.database_integration_layer)
 * - Cloud Services Infrastructure (infrastructure.cloud_services)
 */

// AWS CDK v2.0.0
import * as cdk from 'aws-cdk-lib';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import { Construct } from 'constructs';

// Internal configuration imports
import { DB_CONFIG } from '../../../src/backend/src/config/database.config';

/**
 * DatabaseStack class for managing RDS database resources
 * Implements the database infrastructure requirements from the technical specification
 */
export class DatabaseStack extends cdk.Stack {
  // Public properties for cross-stack references
  public readonly vpc: ec2.IVpc;
  public readonly eventsDb: rds.DatabaseInstance;
  public readonly inventoryDb: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC for database resources with isolated subnets
    this.vpc = new ec2.Vpc(this, 'DatabaseVPC', {
      maxAzs: 2,  // Use 2 Availability Zones for high availability
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        },
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC
        }
      ]
    });

    // Set up database instances
    this.setupDatabaseInstances();

    // Add tags for resource management
    cdk.Tags.of(this).add('Environment', props?.env?.region || 'dev');
    cdk.Tags.of(this).add('Service', 'TestFramework-Database');
  }

  /**
   * Sets up RDS instances for events and inventory databases
   * Implements the database requirements from system_design.database_design
   */
  private setupDatabaseInstances(): void {
    // Create security group for database access
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS instances',
      allowAllOutbound: false
    });

    // Common configuration for both databases
    const commonDbConfig = {
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MEDIUM
      ),
      securityGroups: [dbSecurityGroup],
      multiAz: true,  // Enable high availability
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      storageEncrypted: true,  // Enable encryption at rest
    };

    // Create Events Database instance
    this.eventsDb = new rds.DatabaseInstance(this, 'EventsDatabase', {
      ...commonDbConfig,
      databaseName: 'events_db',
      credentials: rds.Credentials.fromGeneratedSecret('events_admin', {
        secretName: 'events-db-credentials'
      }),
      allocatedStorage: 100,  // 100 GB storage
      maxAllocatedStorage: 200,  // Enable autoscaling up to 200 GB
      parameterGroup: new rds.ParameterGroup(this, 'EventsDbParams', {
        engine: commonDbConfig.engine,
        parameters: {
          'max_connections': '200',
          'shared_buffers': '256MB',
          'work_mem': '64MB',
          'maintenance_work_mem': '256MB',
          'effective_cache_size': '768MB'
        }
      })
    });

    // Create Inventory Database instance
    this.inventoryDb = new rds.DatabaseInstance(this, 'InventoryDatabase', {
      ...commonDbConfig,
      databaseName: 'inventory_db',
      credentials: rds.Credentials.fromGeneratedSecret('inventory_admin', {
        secretName: 'inventory-db-credentials'
      }),
      allocatedStorage: 50,  // 50 GB storage
      maxAllocatedStorage: 100,  // Enable autoscaling up to 100 GB
      parameterGroup: new rds.ParameterGroup(this, 'InventoryDbParams', {
        engine: commonDbConfig.engine,
        parameters: {
          'max_connections': '100',
          'shared_buffers': '128MB',
          'work_mem': '32MB',
          'maintenance_work_mem': '128MB',
          'effective_cache_size': '384MB'
        }
      })
    });

    // Add CloudWatch alarms for monitoring
    new cdk.aws_cloudwatch.Alarm(this, 'EventsDbCpuAlarm', {
      metric: this.eventsDb.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Events Database CPU utilization is high',
      actionsEnabled: true
    });

    new cdk.aws_cloudwatch.Alarm(this, 'InventoryDbCpuAlarm', {
      metric: this.inventoryDb.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Inventory Database CPU utilization is high',
      actionsEnabled: true
    });

    // Configure security group ingress rules
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from within VPC'
    );

    // Add outputs for reference
    new cdk.CfnOutput(this, 'EventsDatabaseEndpoint', {
      value: this.eventsDb.instanceEndpoint.hostname,
      description: 'Events Database endpoint'
    });

    new cdk.CfnOutput(this, 'InventoryDatabaseEndpoint', {
      value: this.inventoryDb.instanceEndpoint.hostname,
      description: 'Inventory Database endpoint'
    });
  }
}