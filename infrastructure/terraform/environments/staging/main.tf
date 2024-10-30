# AWS Provider Configuration
# Provider version: ~> 4.0 as specified in dependencies
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket = "terraform-state-staging"
    key    = "staging/terraform.tfstate"
    region = "us-west-2"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = var.tags
  }
}

# Data source for existing VPC
data "aws_vpc" "main" {
  tags = {
    Environment = var.environment
  }
}

# Data source for private subnets
data "aws_subnet_ids" "private" {
  vpc_id = data.aws_vpc.main.id

  tags = {
    Tier = "private"
  }
}

# S3 Bucket for Application Data
# Implements: Storage requirement from system_architecture.deployment_architecture
resource "aws_s3_bucket" "staging_bucket" {
  bucket = "staging-app-data"
  acl    = "private"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  lifecycle_rule {
    enabled = true

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 90
    }
  }

  tags = {
    Environment = var.environment
    Purpose     = "Application Data Storage"
  }
}

# IAM Role for ECS Task Execution
# Implements: Security requirement from system_architecture.security_architecture
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole-staging"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
  ]

  inline_policy {
    name = "secrets-access"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect = "Allow"
          Action = [
            "secretsmanager:GetSecretValue",
            "kms:Decrypt"
          ]
          Resource = [
            "arn:aws:secretsmanager:${var.region}:*:secret:staging/*",
            "arn:aws:kms:${var.region}:*:key/*"
          ]
        }
      ]
    })
  }
}

# ECS Module Integration
# Implements: Container orchestration from system_architecture.deployment_architecture
module "ecs" {
  source = "../../modules/ecs"

  cluster_name   = var.ecs_cluster_name
  service_name   = "test-framework-service"
  desired_count  = 2
  task_family    = "test-framework-task"

  # Additional variables will be passed from variables.tf
}

# RDS Module Integration
# Implements: Database layer from system_architecture.database_integration_layer
module "rds" {
  source = "../../modules/rds"

  db_name             = var.db_name
  username            = var.db_username
  password            = var.db_password
  instance_class      = var.rds_instance_class
  allocated_storage   = 20
  storage_encrypted   = true
  multi_az           = true
  deletion_protection = true

  backup_retention_period = var.backup_retention_period
  maintenance_window     = "Mon:04:00-Mon:05:00"
  backup_window         = "03:00-04:00"

  monitoring_interval = 60
  performance_insights_enabled = true

  # Additional variables will be passed from variables.tf
}

# Monitoring Module Integration
# Implements: Monitoring requirements from infrastructure.infrastructure_monitoring
module "monitoring" {
  source = "../../modules/monitoring"

  environment = var.environment
  datadog_api_key = var.datadog_api_key

  cloudwatch_dashboard_name = "test-framework-staging"

  cpu_utilization_threshold    = var.cpu_utilization_threshold
  memory_utilization_threshold = var.memory_utilization_threshold

  # Additional monitoring configuration
  alarm_notification_email = "devops@company.com"
}

# Security Group for Application
resource "aws_security_group" "app" {
  name        = "test-framework-app-staging"
  description = "Security group for test framework application in staging"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "test-framework-app-staging"
    Environment = var.environment
  }
}

# CloudWatch Log Group for Application Logs
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/test-framework/staging"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Application = "test-framework"
  }
}

# Outputs
output "staging_s3_bucket_name" {
  description = "Name of the staging S3 bucket"
  value       = aws_s3_bucket.staging_bucket.bucket
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = module.ecs.ecs_cluster_id
}

output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = module.rds.rds_endpoint
  sensitive   = true
}

output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app_logs.name
}