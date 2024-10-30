# Production Environment Variables for Test Framework Infrastructure
# This file defines all variables required for the production environment setup
# Provider version requirements: AWS >= 3.0, Datadog >= 2.0

# ECS Cluster Configuration
# As per infrastructure.cloud_services specification for container orchestration
variable "cluster_name" {
  description = "The name of the ECS cluster."
  type        = string
  default     = "test-framework-prod-cluster"

  validation {
    condition     = length(var.cluster_name) > 3 && length(var.cluster_name) <= 255
    error_message = "Cluster name must be between 3 and 255 characters."
  }
}

variable "service_name" {
  description = "The name of the ECS service."
  type        = string
  default     = "test-framework-prod-service"

  validation {
    condition     = length(var.service_name) > 3 && length(var.service_name) <= 255
    error_message = "Service name must be between 3 and 255 characters."
  }
}

variable "desired_count" {
  description = "The desired number of instances for the ECS service."
  type        = number
  default     = 3

  validation {
    condition     = var.desired_count > 0 && var.desired_count <= 10
    error_message = "Desired count must be between 1 and 10 tasks."
  }
}

# RDS Database Configuration
# As per infrastructure.cloud_services specification for PostgreSQL databases
variable "db_instance_class" {
  description = "The instance type of the RDS instance."
  type        = string
  default     = "db.r5.large"

  validation {
    condition     = can(regex("^db\\.[trm][3-6a-z]\\.(micro|small|medium|large|xlarge|[2-9]?xlarge)$", var.db_instance_class))
    error_message = "Invalid RDS instance class specified."
  }
}

variable "allocated_storage" {
  description = "The allocated storage size for the RDS instance."
  type        = string
  default     = "100"

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.allocated_storage))
    error_message = "Allocated storage must be a positive number."
  }
}

variable "engine" {
  description = "The database engine to use for the RDS instance."
  type        = string
  default     = "postgres"

  validation {
    condition     = var.engine == "postgres"
    error_message = "Only PostgreSQL engine is supported."
  }
}

variable "engine_version" {
  description = "The version of the database engine."
  type        = string
  default     = "13.7"

  validation {
    condition     = can(regex("^\\d+\\.\\d+$", var.engine_version))
    error_message = "Invalid engine version format."
  }
}

variable "db_name" {
  description = "The name of the database to create."
  type        = string
  default     = "test_framework_prod"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.db_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores."
  }
}

variable "username" {
  description = "The master username for the database."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.username))
    error_message = "Username must start with a letter and contain only alphanumeric characters and underscores."
  }
}

variable "password" {
  description = "The master password for the database."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.password) >= 16
    error_message = "Password must be at least 16 characters long."
  }
}

# Monitoring Configuration
# As per infrastructure.cloud_services specification for CloudWatch monitoring
variable "environment" {
  description = "The environment for which the monitoring infrastructure is being set up, e.g., production, staging."
  type        = string
  default     = "production"

  validation {
    condition     = var.environment == "production"
    error_message = "Environment must be set to 'production' for this configuration."
  }
}

variable "datadog_api_key" {
  description = "API key for Datadog integration."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.datadog_api_key) > 0
    error_message = "Datadog API key cannot be empty."
  }
}

variable "cloudwatch_dashboard_name" {
  description = "Name of the CloudWatch dashboard."
  type        = string
  default     = "test-framework-prod-dashboard"

  validation {
    condition     = length(var.cloudwatch_dashboard_name) > 0 && length(var.cloudwatch_dashboard_name) <= 255
    error_message = "Dashboard name must be between 1 and 255 characters."
  }
}

# Additional Production Environment Variables
variable "multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_period >= 30 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 30 and 35 days for production."
  }
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 30

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60."
  }
}

variable "deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = true
}

variable "storage_encrypted" {
  description = "Enable storage encryption for RDS"
  type        = bool
  default     = true
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = true
}

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:03:00-sun:04:00"

  validation {
    condition     = can(regex("^[a-z]{3}:[0-2][0-9]:[0-5][0-9]-[a-z]{3}:[0-2][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in the format 'ddd:hh:mm-ddd:hh:mm'."
  }
}