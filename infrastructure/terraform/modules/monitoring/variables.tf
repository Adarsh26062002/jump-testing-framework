# Required provider versions and configuration
# AWS Provider >= 3.0
# Datadog Provider >= 2.0

# Environment name variable
# Used for resource naming and tagging
variable "environment" {
  description = "Environment name (e.g., staging, production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

# CloudWatch Dashboard configuration
variable "cloudwatch_dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  type        = string
  default     = "system-monitoring"

  validation {
    condition     = length(var.cloudwatch_dashboard_name) > 0 && length(var.cloudwatch_dashboard_name) <= 255
    error_message = "Dashboard name must be between 1 and 255 characters."
  }
}

# Datadog API authentication
variable "datadog_api_key" {
  description = "Datadog API key for authentication"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.datadog_api_key) > 0
    error_message = "Datadog API key cannot be empty."
  }
}

# Alert notification configuration
variable "alert_notification_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = "alerts@example.com"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_notification_email))
    error_message = "Must be a valid email address."
  }
}

# Metric evaluation configuration
variable "metric_evaluation_period" {
  description = "Period in seconds for metric evaluation"
  type        = number
  default     = 300

  validation {
    condition     = var.metric_evaluation_period >= 60 && var.metric_evaluation_period <= 86400
    error_message = "Metric evaluation period must be between 60 and 86400 seconds."
  }
}

# Resource utilization thresholds
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

# Resource tagging configuration
variable "tags" {
  description = "Tags to be applied to all monitoring resources"
  type        = map(string)
  default     = {}

  validation {
    condition     = length(keys(var.tags)) <= 50
    error_message = "Maximum of 50 tags can be specified."
  }
}