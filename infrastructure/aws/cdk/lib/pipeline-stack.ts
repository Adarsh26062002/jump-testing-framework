/**
 * AWS CDK Stack for CI/CD Pipeline Infrastructure
 * Implements automated deployment and testing processes for the test framework.
 * 
 * Requirements addressed:
 * - CI/CD Pipeline (infrastructure.ci/cd_pipeline)
 * - Pipeline Configuration (infrastructure.pipeline_configuration)
 */

// AWS CDK v2.0.0
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';  // v10.0.0
import * as codepipeline from '@aws-cdk/aws-codepipeline';  // v2.0.0
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as sns from '@aws-cdk/aws-sns';
import * as iam from '@aws-cdk/aws-iam';

// Import dependent stacks
import { DatabaseStack } from './database-stack';
import { MonitoringStack } from './monitoring-stack';

/**
 * PipelineStack class for managing the CI/CD pipeline infrastructure
 * Implements the pipeline requirements from the technical specification
 */
export class PipelineStack extends cdk.Stack {
  // Public properties for cross-stack references
  public readonly deploymentPipeline: codepipeline.Pipeline;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference VPC from DatabaseStack for network configuration
    const databaseStack = new DatabaseStack(this, 'DatabaseStack', props);
    const vpc = databaseStack.vpc;

    // Reference SNS topic from MonitoringStack for notifications
    const monitoringStack = new MonitoringStack(this, 'MonitoringStack', props);
    this.alarmTopic = monitoringStack.alarmTopic;

    // Set up the pipeline
    this.setupPipeline(vpc);

    // Add tags for resource management
    cdk.Tags.of(this).add('Environment', props?.env?.region || 'dev');
    cdk.Tags.of(this).add('Service', 'TestFramework-Pipeline');
  }

  /**
   * Sets up the CI/CD pipeline with all stages and actions
   * Implements the pipeline configuration requirements
   */
  private setupPipeline(vpc: ec2.IVpc): void {
    // Create artifact objects for pipeline stages
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');
    const testOutput = new codepipeline.Artifact('TestOutput');

    // Create the pipeline
    this.deploymentPipeline = new codepipeline.Pipeline(this, 'TestFrameworkPipeline', {
      pipelineName: 'TestFramework-Pipeline',
      crossAccountKeys: true,
      restartExecutionOnUpdate: true,
      artifactBucket: new cdk.aws_s3.Bucket(this, 'ArtifactBucket', {
        encryption: cdk.aws_s3.BucketEncryption.KMS_MANAGED,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }),
    });

    // Add source stage
    this.deploymentPipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.GitHubSourceAction({
          actionName: 'GitHub_Source',
          owner: process.env.GITHUB_OWNER || 'your-org',
          repo: process.env.GITHUB_REPO || 'test-framework',
          branch: 'main',
          oauthToken: cdk.SecretValue.secretsManager('github-token'),
          output: sourceOutput,
          trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
        }),
      ],
    });

    // Add build stage
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: 'TestFramework-Build',
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm run lint',
            ],
          },
        },
        artifacts: {
          files: ['**/*'],
          'base-directory': 'dist',
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      vpc,
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });

    this.deploymentPipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Build',
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // Add test stage
    const testProject = new codebuild.PipelineProject(this, 'TestProject', {
      projectName: 'TestFramework-Test',
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run test:unit',
              'npm run test:integration',
            ],
          },
        },
        reports: {
          coverage: {
            files: ['coverage/clover.xml'],
            'file-format': 'CLOVERXML',
          },
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
      },
      vpc,
    });

    this.deploymentPipeline.addStage({
      stageName: 'Test',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Test',
          project: testProject,
          input: buildOutput,
          outputs: [testOutput],
        }),
      ],
    });

    // Add staging deployment stage
    const stagingDeployProject = this.createDeployProject('Staging');
    this.deploymentPipeline.addStage({
      stageName: 'DeployToStaging',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Deploy',
          project: stagingDeployProject,
          input: buildOutput,
          environmentVariables: {
            ENVIRONMENT: { value: 'staging' },
          },
        }),
      ],
    });

    // Add production deployment stage with manual approval
    const productionDeployProject = this.createDeployProject('Production');
    this.deploymentPipeline.addStage({
      stageName: 'DeployToProduction',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'Approve',
          notificationTopic: this.alarmTopic,
          additionalInformation: 'Please review the changes before deploying to production',
        }),
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Deploy',
          project: productionDeployProject,
          input: buildOutput,
          environmentVariables: {
            ENVIRONMENT: { value: 'production' },
          },
        }),
      ],
    });

    // Set up pipeline notifications
    this.setupPipelineNotifications();
  }

  /**
   * Creates a deployment project for a specific environment
   */
  private createDeployProject(environment: string): codebuild.PipelineProject {
    return new codebuild.PipelineProject(this, `DeployProject-${environment}`, {
      projectName: `TestFramework-Deploy-${environment}`,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run cdk deploy -- --require-approval never',
              './infrastructure/aws/scripts/health-check.sh',
            ],
          },
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT: { value: process.env.AWS_ACCOUNT || 'default' },
          AWS_REGION: { value: process.env.AWS_REGION || 'us-east-1' },
        },
      },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });
  }

  /**
   * Sets up notifications for pipeline events
   */
  private setupPipelineNotifications(): void {
    // Create CloudWatch event rule for pipeline state changes
    const rule = new cdk.aws_events.Rule(this, 'PipelineStateChange', {
      eventPattern: {
        source: ['aws.codepipeline'],
        detailType: ['CodePipeline Pipeline Execution State Change'],
        detail: {
          pipeline: [this.deploymentPipeline.pipelineName],
        },
      },
    });

    // Add target to send notifications to SNS topic
    rule.addTarget(new cdk.aws_events_targets.SnsTopic(this.alarmTopic, {
      message: cdk.aws_events.RuleTargetInput.fromText(
        `Pipeline ${cdk.aws_events.EventField.fromPath('$.detail.pipeline')} ` +
        `changed state to ${cdk.aws_events.EventField.fromPath('$.detail.state')}`
      ),
    }));
  }
}