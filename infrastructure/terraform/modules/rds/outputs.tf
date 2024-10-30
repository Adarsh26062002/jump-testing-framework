# RDS Instance Outputs
# These outputs expose critical information about the RDS instance
# for use by other modules and the application layer

# Implements requirement from system_architecture.database_integration_layer
# Exposes the connection endpoint for database clients
output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.this.endpoint
  sensitive   = false  # Endpoint is not sensitive as it's needed for connection
}

# Implements requirement from system_architecture.database_integration_layer
# Exposes the ARN for resource identification and IAM policies
output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.this.arn
  sensitive   = false  # ARN is not sensitive as it's used for resource identification
}

# Implements requirement from system_architecture.database_integration_layer
# Exposes the database name for connection configuration
output "db_instance_name" {
  description = "The name identifier of the RDS instance"
  value       = aws_db_instance.this.db_name
  sensitive   = false  # Database name is not sensitive as it's needed for connection
}

# Implements requirement from system_architecture.database_integration_layer
# Exposes the database engine type for client configuration
output "db_instance_engine" {
  description = "The database engine type of the RDS instance"
  value       = aws_db_instance.this.engine
  sensitive   = false  # Engine type is not sensitive information
}

# Additional outputs for comprehensive database management

output "db_instance_status" {
  description = "The current status of the RDS instance"
  value       = aws_db_instance.this.status
  sensitive   = false
}

output "db_instance_id" {
  description = "The RDS instance identifier"
  value       = aws_db_instance.this.id
  sensitive   = false
}

output "db_instance_port" {
  description = "The port on which the DB accepts connections"
  value       = aws_db_instance.this.port
  sensitive   = false
}

output "db_instance_resource_id" {
  description = "The RDS Resource ID of this instance"
  value       = aws_db_instance.this.resource_id
  sensitive   = false
}

output "db_instance_availability_zone" {
  description = "The availability zone of the RDS instance"
  value       = aws_db_instance.this.availability_zone
  sensitive   = false
}

output "db_instance_backup_retention_period" {
  description = "The backup retention period"
  value       = aws_db_instance.this.backup_retention_period
  sensitive   = false
}

output "db_instance_multi_az" {
  description = "If the RDS instance is multi-AZ"
  value       = aws_db_instance.this.multi_az
  sensitive   = false
}

output "db_instance_storage_encrypted" {
  description = "Whether the DB instance is encrypted"
  value       = aws_db_instance.this.storage_encrypted
  sensitive   = false
}

output "db_instance_performance_insights_enabled" {
  description = "Whether Performance Insights is enabled"
  value       = aws_db_instance.this.performance_insights_enabled
  sensitive   = false
}

# Configuration outputs for reference
output "db_instance_allocated_storage" {
  description = "The amount of allocated storage"
  value       = aws_db_instance.this.allocated_storage
  sensitive   = false
}

output "db_instance_engine_version" {
  description = "The running version of the database engine"
  value       = aws_db_instance.this.engine_version
  sensitive   = false
}

output "db_instance_class" {
  description = "The RDS instance class"
  value       = aws_db_instance.this.instance_class
  sensitive   = false
}

# Security-related outputs
output "db_instance_security_group_ids" {
  description = "Security groups associated with the RDS instance"
  value       = aws_db_instance.this.vpc_security_group_ids
  sensitive   = false
}

output "db_instance_parameter_group_name" {
  description = "The name of the DB parameter group"
  value       = aws_db_instance.this.parameter_group_name
  sensitive   = false
}

# Monitoring outputs
output "db_instance_monitoring_interval" {
  description = "The interval, in seconds, between points when Enhanced Monitoring metrics are collected"
  value       = aws_db_instance.this.monitoring_interval
  sensitive   = false
}

output "db_instance_maintenance_window" {
  description = "The instance maintenance window"
  value       = aws_db_instance.this.maintenance_window
  sensitive   = false
}

output "db_instance_backup_window" {
  description = "The backup window"
  value       = aws_db_instance.this.backup_window
  sensitive   = false
}