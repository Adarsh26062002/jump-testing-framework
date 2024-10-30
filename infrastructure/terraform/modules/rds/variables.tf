# AWS RDS Instance Configuration Variables
# These variables define the configuration for PostgreSQL RDS instances
# supporting the test framework's database layer

variable "db_instance_class" {
  description = "The instance type of the RDS instance."
  type        = string
  default     = "db.t2.micro"

  # Recommended instance classes based on workload:
  # - Development: db.t2.micro
  # - Staging: db.t3.medium
  # - Production: db.r5.large or db.r5.xlarge for high performance
}

variable "allocated_storage" {
  description = "The allocated storage size for the RDS instance in gigabytes."
  type        = string
  default     = "20"

  # Minimum storage requirements:
  # - Events DB: 20GB
  # - Inventory DB: 20GB
  # - Test Results DB: 20GB
  # Storage can be increased but not decreased
}

variable "engine" {
  description = "The database engine to use for the RDS instance."
  type        = string
  default     = "postgres"

  # PostgreSQL is the primary database engine as per technical specifications
  # for Events DB, Inventory DB, and Test Results DB
}

variable "engine_version" {
  description = "The version of the database engine."
  type        = string
  default     = "12.5"

  # PostgreSQL version 12.5 or higher recommended for:
  # - Partitioning support
  # - Performance improvements
  # - Extended indexing capabilities
}

variable "db_name" {
  description = "The name of the database to create."
  type        = string
  default     = "mydb"

  # Database naming convention:
  # - events_db: For events database
  # - inventory_db: For inventory database
  # - test_results_db: For test results database
}

variable "username" {
  description = "The username for the master DB user."
  type        = string
  default     = "admin"

  # Master user should be used only for initial setup
  # Application-specific users should be created for regular operations
}

variable "password" {
  description = "The password for the master DB user."
  type        = string
  default     = "password"

  # Production passwords should:
  # - Be at least 16 characters
  # - Include special characters
  # - Be rotated regularly
  # - Never use this default value
}

variable "parameter_group_name" {
  description = "The name of the DB parameter group to associate with the RDS instance."
  type        = string
  default     = "default"

  # Custom parameter groups should be used for:
  # - Connection pooling optimization
  # - Query performance tuning
  # - Logging configuration
}

# Additional configuration variables for enhanced functionality

variable "backup_retention_period" {
  description = "The number of days to retain automated backups."
  type        = number
  default     = 7

  # Retention periods:
  # - Development: 1 day
  # - Staging: 7 days
  # - Production: 30 days minimum
}

variable "multi_az" {
  description = "Whether to enable Multi-AZ deployment for high availability."
  type        = bool
  default     = false

  # Enable for production environments
  # Required for high availability as per technical specifications
}

variable "storage_encrypted" {
  description = "Whether to encrypt the storage at rest."
  type        = bool
  default     = true

  # Required for data security compliance
  # Must be enabled in production environments
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection."
  type        = bool
  default     = true

  # Recommended settings:
  # - Development: false
  # - Staging: true
  # - Production: true
}

variable "monitoring_interval" {
  description = "The interval, in seconds, between points when Enhanced Monitoring metrics are collected."
  type        = number
  default     = 60

  # Monitoring intervals:
  # - Development: 0 (disabled)
  # - Staging: 60
  # - Production: 30
}

variable "performance_insights_enabled" {
  description = "Whether to enable Performance Insights."
  type        = bool
  default     = true

  # Enable for production databases
  # Helps with query performance monitoring
}

variable "skip_final_snapshot" {
  description = "Whether to skip final snapshot when destroying the database."
  type        = bool
  default     = false

  # Set to true only in development
  # Always false in production for data protection
}

variable "maintenance_window" {
  description = "The window to perform maintenance in."
  type        = string
  default     = "Mon:03:00-Mon:04:00"

  # Schedule maintenance during off-peak hours
  # Coordinate with application deployment windows
}

variable "backup_window" {
  description = "The daily time range during which automated backups are created."
  type        = string
  default     = "02:00-03:00"

  # Schedule backups before maintenance window
  # Ensure minimal impact on application performance
}