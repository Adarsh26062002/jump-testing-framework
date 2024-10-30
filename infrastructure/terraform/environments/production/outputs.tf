# Production Environment Infrastructure Outputs
# Terraform AWS Provider version: >= 4.0.0 (inherited from main.tf)

# This file implements the requirements from infrastructure.deployment_environment
# and infrastructure.infrastructure_monitoring sections of the technical specification.
# It provides essential output values for the production environment infrastructure
# components including ECS, RDS, and monitoring resources.

# ECS Cluster Output
# Implements requirement: Production environment ECS cluster access
# Used for service deployment and container orchestration
output "ecs_cluster_id" {
  description = "The ID of the ECS cluster created."
  value       = module.ecs.ecs_cluster_id
  sensitive   = false
}

# RDS Instance Output
# Implements requirement: Production database connectivity
# Used for application database connections
output "rds_endpoint" {
  description = "The endpoint of the RDS instance."
  value       = module.rds.db_instance_endpoint
  sensitive   = false
}

# Monitoring Dashboard Output
# Implements requirement: Infrastructure monitoring access
# Used for system monitoring and observability
output "monitoring_dashboard_url" {
  description = "The URL of the monitoring dashboard."
  value       = module.monitoring.cloudwatch_dashboard_url
  sensitive   = false
}

# Additional Production Environment Outputs
# These outputs provide comprehensive information about the production infrastructure

# Database Configuration Outputs
output "rds_instance_id" {
  description = "The identifier of the RDS instance"
  value       = module.rds.db_instance_id
  sensitive   = false
}

output "rds_availability_zone" {
  description = "The availability zone of the RDS instance"
  value       = module.rds.db_instance_availability_zone
  sensitive   = false
}

output "rds_backup_retention_period" {
  description = "The backup retention period for the RDS instance"
  value       = module.rds.db_instance_backup_retention_period
  sensitive   = false
}

output "rds_multi_az" {
  description = "Whether the RDS instance is multi-AZ"
  value       = module.rds.db_instance_multi_az
  sensitive   = false
}

# Monitoring and Alerting Outputs
output "monitoring_sns_topic_arn" {
  description = "The ARN of the SNS topic for monitoring alerts"
  value       = module.monitoring.sns_topic_arn
  sensitive   = false
}

output "test_execution_alarm_arn" {
  description = "The ARN of the test execution duration alarm"
  value       = module.monitoring.test_execution_alarm_arn
  sensitive   = false
}

output "api_latency_alarm_arn" {
  description = "The ARN of the API latency alarm"
  value       = module.monitoring.api_latency_alarm_arn
  sensitive   = false
}

output "database_connection_alarm_arn" {
  description = "The ARN of the database connection alarm"
  value       = module.monitoring.database_connection_alarm_arn
  sensitive   = false
}

# Security and Compliance Outputs
output "rds_storage_encrypted" {
  description = "Whether the RDS storage is encrypted"
  value       = module.rds.db_instance_storage_encrypted
  sensitive   = false
}

output "rds_security_group_ids" {
  description = "Security group IDs associated with the RDS instance"
  value       = module.rds.db_instance_security_group_ids
  sensitive   = false
}

# Performance Monitoring Outputs
output "rds_performance_insights_enabled" {
  description = "Whether Performance Insights is enabled for RDS"
  value       = module.rds.db_instance_performance_insights_enabled
  sensitive   = false
}

output "rds_monitoring_interval" {
  description = "The monitoring interval for RDS Enhanced Monitoring"
  value       = module.rds.db_instance_monitoring_interval
  sensitive   = false
}

# Maintenance Window Outputs
output "rds_maintenance_window" {
  description = "The maintenance window for RDS instance"
  value       = module.rds.db_instance_maintenance_window
  sensitive   = false
}

output "rds_backup_window" {
  description = "The backup window for RDS instance"
  value       = module.rds.db_instance_backup_window
  sensitive   = false
}

# Datadog Integration Outputs
output "datadog_cpu_monitor_id" {
  description = "The ID of the Datadog CPU usage monitor"
  value       = module.monitoring.datadog_cpu_monitor_id
  sensitive   = false
}

output "datadog_api_latency_monitor_id" {
  description = "The ID of the Datadog API latency monitor"
  value       = module.monitoring.datadog_api_latency_monitor_id
  sensitive   = false
}

output "datadog_database_monitor_id" {
  description = "The ID of the Datadog database monitor"
  value       = module.monitoring.datadog_database_monitor_id
  sensitive   = false
}

output "datadog_test_execution_monitor_id" {
  description = "The ID of the Datadog test execution monitor"
  value       = module.monitoring.datadog_test_execution_monitor_id
  sensitive   = false
}