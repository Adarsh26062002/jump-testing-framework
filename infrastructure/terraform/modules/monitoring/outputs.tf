# Output definitions for monitoring infrastructure components
# Implements monitoring requirements from infrastructure.infrastructure_monitoring

# CloudWatch Dashboard URL output
# Provides access to the monitoring dashboard for system metrics visualization
output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.system_monitoring.dashboard_url
}

# SNS Topic ARN output
# Used for alert notifications integration
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.monitoring_alerts.arn
}

# Test Execution Duration Alarm ARN
output "test_execution_alarm_arn" {
  description = "ARN of the CloudWatch alarm for test execution duration"
  value       = aws_cloudwatch_metric_alarm.high_test_execution_duration.arn
}

# API Latency Alarm ARN
output "api_latency_alarm_arn" {
  description = "ARN of the CloudWatch alarm for API latency"
  value       = aws_cloudwatch_metric_alarm.high_api_latency.arn
}

# Database Connection Alarm ARN
output "database_connection_alarm_arn" {
  description = "ARN of the CloudWatch alarm for database connections"
  value       = aws_cloudwatch_metric_alarm.database_connection_failure.arn
}

# CPU Usage Alarm ARN
output "cpu_usage_alarm_arn" {
  description = "ARN of the CloudWatch alarm for CPU usage"
  value       = aws_cloudwatch_metric_alarm.high_cpu_usage.arn
}

# Datadog Monitor IDs
output "datadog_cpu_monitor_id" {
  description = "ID of the Datadog monitor for CPU usage"
  value       = datadog_monitor.high_cpu_usage.id
}

output "datadog_api_latency_monitor_id" {
  description = "ID of the Datadog monitor for API latency"
  value       = datadog_monitor.api_latency.id
}

output "datadog_database_monitor_id" {
  description = "ID of the Datadog monitor for database connections"
  value       = datadog_monitor.database_connections.id
}

output "datadog_test_execution_monitor_id" {
  description = "ID of the Datadog monitor for test execution duration"
  value       = datadog_monitor.test_execution_duration.id
}

# Environment Tag
output "monitoring_environment" {
  description = "Environment where monitoring resources are deployed"
  value       = var.environment
}