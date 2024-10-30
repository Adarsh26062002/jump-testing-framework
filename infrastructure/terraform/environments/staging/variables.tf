# Terraform Variables for Staging Environment
# AWS Provider version >= 3.0
# This file defines input variables for staging environment infrastructure

# Environment Configuration
variable "environment" {
  description = "The environment for which the infrastructure is being set up, e.g., staging."
  type        = string
  default     = "staging"

  validation {
    condition     = var.environment == "staging"
    error_message = "This configuration is specifically for staging environment."
  }
}

# Region Configuration
variable "region" {
  description = "The AWS region where the resources will be deployed."
  type        = string
  default     = "us-west-2"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]{1}$", var.region))
    error_message = "Must be a valid AWS region identifier."
  }
}

# ECS Configuration
variable "ecs_cluster_name" {
  description = "The name of the ECS cluster for the staging environment."
  type        = string
  default     = "staging-cluster"

  validation {
    condition     = length(var.ecs_cluster_name) > 3 && length(var.ecs_cluster_name) <= 255
    error_message = "Cluster name must be between 3 and 255 characters."
  }
}

# RDS Configuration
variable "rds_instance_class" {
  description = "The instance type of the RDS instance."
  type        = string
  default     = "db.t2.micro"

  validation {
    condition     = can(regex("^db\\.[t2|t3|r5]\\.", var.rds_instance_class))
    error_message = "Must be a valid RDS instance class starting with db.t2, db.t3, or db.r5."
  }
}

# Monitoring Configuration
variable "datadog_api_key" {
  description = "API key for Datadog integration."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.datadog_api_key) > 0
    error_message = "Datadog API key cannot be empty."
  }
}

# Network Configuration
variable "vpc_cidr" {
  description = "The CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

# Database Configuration
variable "db_name" {
  description = "The name of the RDS database."
  type        = string
  default     = "testdb"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.db_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores."
  }
}

variable "db_username" {
  description = "The username for the RDS database."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_username) >= 3 && length(var.db_username) <= 63
    error_message = "Database username must be between 3 and 63 characters."
  }
}

variable "db_password" {
  description = "The password for the RDS database."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Database password must be at least 8 characters long."
  }
}

# ECS Task Configuration
variable "task_cpu" {
  description = "CPU units for the ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 2048

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.task_cpu)
    error_message = "CPU units must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "task_memory" {
  description = "Memory for the ECS task in MB"
  type        = number
  default     = 4096

  validation {
    condition     = var.task_memory >= 512 && var.task_memory <= 30720
    error_message = "Memory must be between 512MB and 30720MB."
  }
}

# Monitoring Thresholds
variable "cpu_utilization_threshold" {
  description = "CPU utilization threshold percentage for alerts"
  type        = number
  default     = 80

  validation {
    condition     = var.cpu_utilization_threshold > 0 && var.cpu_utilization_threshold <= 100
    error_message = "CPU utilization threshold must be between 1 and 100 percent."
  }
}

variable "memory_utilization_threshold" {
  description = "Memory utilization threshold percentage for alerts"
  type        = number
  default     = 85

  validation {
    condition     = var.memory_utilization_threshold > 0 && var.memory_utilization_threshold <= 100
    error_message = "Memory utilization threshold must be between 1 and 100 percent."
  }
}

# Backup Configuration
variable "backup_retention_period" {
  description = "The number of days to retain automated backups"
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days."
  }
}

# Tags Configuration
variable "tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default = {
    Environment = "staging"
    Terraform   = "true"
    Project     = "test-framework"
  }
}