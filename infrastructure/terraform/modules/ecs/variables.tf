# AWS ECS Module Variables
# This file defines the input variables for the ECS module configuration
# Provider version: >= 3.0

# Name of the ECS cluster
# As per infrastructure.orchestration specification, this will be used for the main cluster
variable "cluster_name" {
  type        = string
  description = "Name of the ECS cluster"
  default     = "test-framework-cluster"

  validation {
    condition     = length(var.cluster_name) > 3 && length(var.cluster_name) <= 255
    error_message = "Cluster name must be between 3 and 255 characters."
  }
}

# Name of the ECS service
# Used for the main service running the test framework containers
variable "service_name" {
  type        = string
  description = "Name of the ECS service"
  default     = "test-framework-service"

  validation {
    condition     = length(var.service_name) > 3 && length(var.service_name) <= 255
    error_message = "Service name must be between 3 and 255 characters."
  }
}

# Desired count of tasks
# Based on infrastructure.orchestration specification for initial task count
# Can be adjusted by auto-scaling based on CPU utilization
variable "desired_count" {
  type        = number
  description = "Desired number of tasks"
  default     = 2

  validation {
    condition     = var.desired_count > 0 && var.desired_count <= 10
    error_message = "Desired count must be between 1 and 10 tasks."
  }
}

# Task definition family name
# Used to group multiple versions of the same task definition
variable "task_family" {
  type        = string
  description = "Family name for task definition"
  default     = "test-framework-task"

  validation {
    condition     = length(var.task_family) > 3 && length(var.task_family) <= 255
    error_message = "Task family name must be between 3 and 255 characters."
  }
}

# Additional variables required by main.tf but not exposed in the module interface
variable "environment" {
  type        = string
  description = "Deployment environment (staging/production)"
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

# CPU units for the ECS task
# Based on infrastructure.orchestration specification: 2 vCPU
variable "task_cpu" {
  type        = number
  description = "CPU units for the task (1024 = 1 vCPU)"
  default     = 2048

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.task_cpu)
    error_message = "CPU units must be one of: 256, 512, 1024, 2048, 4096."
  }
}

# Memory for the ECS task
# Based on infrastructure.orchestration specification: 4GB RAM
variable "task_memory" {
  type        = number
  description = "Memory for the task in MB"
  default     = 4096

  validation {
    condition     = var.task_memory >= 512 && var.task_memory <= 30720
    error_message = "Memory must be between 512MB and 30720MB."
  }
}

# Auto-scaling configuration
# Based on infrastructure.orchestration specification: CPU utilization > 70%
variable "cpu_scaling_target" {
  type        = number
  description = "Target CPU utilization percentage for auto-scaling"
  default     = 70

  validation {
    condition     = var.cpu_scaling_target > 0 && var.cpu_scaling_target <= 100
    error_message = "CPU scaling target must be between 1 and 100 percent."
  }
}

# Health check configuration
variable "health_check_grace_period" {
  type        = number
  description = "Health check grace period in seconds"
  default     = 60

  validation {
    condition     = var.health_check_grace_period >= 0 && var.health_check_grace_period <= 1800
    error_message = "Health check grace period must be between 0 and 1800 seconds."
  }
}

# Log retention period
variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention period in days"
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be one of the allowed values as per AWS CloudWatch."
  }
}