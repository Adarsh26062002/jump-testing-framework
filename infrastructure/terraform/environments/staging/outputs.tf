# Terraform outputs for staging environment infrastructure components
# Implements requirements from system_architecture.deployment_architecture
# Provider version: hashicorp/aws ~> 4.0

# ECS Cluster Output
# Exposes the ECS cluster ID for external reference and integration
output "ecs_cluster_id" {
  description = "The ID of the ECS cluster created for the staging environment."
  value       = module.ecs.cluster_id
}

# RDS Instance Output
# Exposes the RDS endpoint for database connections
output "rds_endpoint" {
  description = "The endpoint of the RDS instance for the staging environment."
  value       = module.rds.db_instance_endpoint
}

# Monitoring Dashboard Output
# Provides access to the monitoring dashboard URL
output "monitoring_dashboard_url" {
  description = "The URL of the monitoring dashboard for the staging environment."
  value       = module.monitoring.cloudwatch_dashboard_url
}

# Additional RDS Outputs for comprehensive monitoring and management
output "rds_instance_status" {
  description = "Current status of the RDS instance in staging"
  value       = module.rds.db_instance_status
}

output "rds_instance_id" {
  description = "The identifier of the RDS instance"
  value       = module.rds.db_instance_id
}

output "rds_availability_zone" {
  description = "The availability zone where the RDS instance is deployed"
  value       = module.rds.db_instance_availability_zone
}

# Monitoring and Alerting Outputs
output "monitoring_sns_topic_arn" {
  description = "ARN of the SNS topic used for monitoring alerts"
  value       = module.monitoring.sns_topic_arn
}

output "test_execution_alarm_arn" {
  description = "ARN of the alarm monitoring test execution duration"
  value       = module.monitoring.test_execution_alarm_arn
}

output "api_latency_alarm_arn" {
  description = "ARN of the alarm monitoring API latency"
  value       = module.monitoring.api_latency_alarm_arn
}

output "database_connection_alarm_arn" {
  description = "ARN of the alarm monitoring database connections"
  value       = module.monitoring.database_connection_alarm_arn
}

# Datadog Integration Outputs
output "datadog_monitor_ids" {
  description = "IDs of the Datadog monitors for various components"
  value = {
    cpu_usage        = module.monitoring.datadog_cpu_monitor_id
    api_latency      = module.monitoring.datadog_api_latency_monitor_id
    database         = module.monitoring.datadog_database_monitor_id
    test_execution   = module.monitoring.datadog_test_execution_monitor_id
  }
}

# Database Configuration Outputs
output "rds_backup_retention_period" {
  description = "The backup retention period for the RDS instance"
  value       = module.rds.db_instance_backup_retention_period
}

output "rds_multi_az" {
  description = "Whether the RDS instance is configured for multi-AZ deployment"
  value       = module.rds.db_instance_multi_az
}

output "rds_storage_encrypted" {
  description = "Whether the RDS storage is encrypted"
  value       = module.rds.db_instance_storage_encrypted
}

output "rds_performance_insights_enabled" {
  description = "Whether Performance Insights is enabled for RDS"
  value       = module.rds.db_instance_performance_insights_enabled
}

# Security Group Outputs
output "rds_security_group_ids" {
  description = "Security groups associated with the RDS instance"
  value       = module.rds.db_instance_security_group_ids
}