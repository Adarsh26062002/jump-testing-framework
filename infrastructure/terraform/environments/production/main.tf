# Main Terraform configuration file for production environment
# Implements infrastructure requirements from infrastructure.deployment_environment
# Provider versions: AWS >= 3.0, Datadog >= 2.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 3.0"
    }
    datadog = {
      source  = "DataDog/datadog"
      version = ">= 2.0"
    }
  }

  # Configure backend for state management
  backend "s3" {
    bucket         = "test-framework-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Configure the AWS Provider
provider "aws" {
  region = "us-west-2"

  default_tags {
    tags = {
      Environment = "production"
      Project     = "test-framework"
      ManagedBy   = "terraform"
    }
  }
}

# Configure the Datadog Provider
provider "datadog" {
  api_key = var.datadog_api_key
}

# ECS Module for container orchestration
# Implements requirements from infrastructure.cloud_services
module "ecs" {
  source = "../modules/ecs"

  cluster_name  = var.cluster_name
  service_name  = var.service_name
  desired_count = var.desired_count

  # Additional ECS-specific variables are passed through from variables.tf
}

# RDS Module for PostgreSQL database
# Implements requirements from infrastructure.cloud_services
module "rds" {
  source = "../modules/rds"

  db_instance_class    = var.db_instance_class
  allocated_storage    = var.allocated_storage
  engine              = var.engine
  engine_version      = var.engine_version
  db_name             = var.db_name
  username            = var.username
  password            = var.password

  # High availability settings for production
  multi_az               = var.multi_az
  backup_retention_period = var.backup_retention_period
  monitoring_interval    = var.monitoring_interval
  deletion_protection    = var.deletion_protection
  storage_encrypted      = var.storage_encrypted
  performance_insights_enabled = var.performance_insights_enabled
  maintenance_window     = var.maintenance_window

  # Additional RDS-specific variables are passed through from variables.tf
}

# Monitoring Module for observability
# Implements requirements from infrastructure.infrastructure_monitoring
module "monitoring" {
  source = "../modules/monitoring"

  environment               = var.environment
  datadog_api_key          = var.datadog_api_key
  cloudwatch_dashboard_name = var.cloudwatch_dashboard_name

  # Pass through references to monitored resources
  ecs_cluster_name = module.ecs.cluster_name
  rds_instance_id = module.rds.instance_id

  # Additional monitoring-specific variables are passed through from variables.tf
}

# VPC Data Source
# Used by ECS and RDS modules for network configuration
data "aws_vpc" "main" {
  tags = {
    Environment = "production"
    Name        = "test-framework-vpc"
  }
}

# Subnet Data Sources
data "aws_subnet_ids" "private" {
  vpc_id = data.aws_vpc.main.id

  tags = {
    Tier = "private"
  }
}

data "aws_subnet_ids" "public" {
  vpc_id = data.aws_vpc.main.id

  tags = {
    Tier = "public"
  }
}

# Security Group for allowing internal communication
resource "aws_security_group" "internal" {
  name        = "test-framework-internal-sg"
  description = "Security group for internal communication"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "test-framework-internal-sg"
  }
}

# S3 Bucket for test artifacts
# Implements requirements from infrastructure.cloud_services
resource "aws_s3_bucket" "test_artifacts" {
  bucket = "test-framework-artifacts-prod"

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

    transition {
      days          = 60
      storage_class = "GLACIER"
    }

    expiration {
      days = 90
    }
  }
}

# CloudWatch Log Group for centralized logging
resource "aws_cloudwatch_log_group" "test_framework" {
  name              = "/test-framework/production"
  retention_in_days = 30

  tags = {
    Environment = "production"
    Service     = "test-framework"
  }
}

# SNS Topic for infrastructure alerts
resource "aws_sns_topic" "infrastructure_alerts" {
  name = "test-framework-infrastructure-alerts"

  tags = {
    Environment = "production"
    Service     = "test-framework"
  }
}

# KMS Key for encryption
resource "aws_kms_key" "test_framework" {
  description             = "KMS key for test framework encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = "production"
    Service     = "test-framework"
  }
}

# SSM Parameters for sensitive configuration
resource "aws_ssm_parameter" "database_password" {
  name        = "/test-framework/production/database/password"
  description = "Database password for test framework"
  type        = "SecureString"
  value       = var.password
  key_id      = aws_kms_key.test_framework.key_id

  tags = {
    Environment = "production"
    Service     = "test-framework"
  }
}

resource "aws_ssm_parameter" "datadog_api_key" {
  name        = "/test-framework/production/datadog/api_key"
  description = "Datadog API key for test framework"
  type        = "SecureString"
  value       = var.datadog_api_key
  key_id      = aws_kms_key.test_framework.key_id

  tags = {
    Environment = "production"
    Service     = "test-framework"
  }
}