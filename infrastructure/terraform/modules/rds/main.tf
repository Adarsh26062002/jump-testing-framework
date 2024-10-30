# AWS RDS Module - Main Configuration
# Implements the database integration layer requirements for the test framework
# as specified in system_architecture.database_integration_layer

# Provider configuration block is assumed to be in the root module

# Random string for unique identifier
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Security group for RDS instance
resource "aws_security_group" "rds" {
  name        = "rds-sg-${random_string.suffix.result}"
  description = "Security group for RDS instance"

  # PostgreSQL port ingress
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # VPC CIDR - should be parameterized based on environment
  }

  # Allow all egress
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "rds-security-group"
    Environment = "production"
    Terraform   = "true"
  }
}

# DB subnet group
resource "aws_db_subnet_group" "rds" {
  name        = "rds-subnet-group-${random_string.suffix.result}"
  description = "RDS subnet group for database instances"
  subnet_ids  = ["subnet-12345678", "subnet-87654321"] # Should be parameterized

  tags = {
    Name        = "rds-subnet-group"
    Environment = "production"
    Terraform   = "true"
  }
}

# DB parameter group
resource "aws_db_parameter_group" "rds" {
  name        = "rds-pg-${random_string.suffix.result}"
  family      = "postgres12"
  description = "Custom parameter group for PostgreSQL 12"

  # Connection pooling parameters
  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/32768}"
  }

  # Query optimization parameters
  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/8192}"
  }

  parameter {
    name  = "work_mem"
    value = "4096"
  }

  # Logging parameters
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  tags = {
    Name        = "rds-parameter-group"
    Environment = "production"
    Terraform   = "true"
  }
}

# RDS instance
resource "aws_db_instance" "this" {
  identifier = "rds-${var.db_name}-${random_string.suffix.result}"

  # Engine configuration
  engine               = var.engine
  engine_version       = var.engine_version
  instance_class       = var.db_instance_class
  allocated_storage    = var.allocated_storage
  storage_encrypted    = var.storage_encrypted
  storage_type         = "gp2"

  # Database configuration
  db_name  = var.db_name
  username = var.username
  password = var.password
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az              = var.multi_az

  # Maintenance configuration
  maintenance_window      = var.maintenance_window
  backup_window          = var.backup_window
  backup_retention_period = var.backup_retention_period
  deletion_protection    = var.deletion_protection
  skip_final_snapshot    = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.db_name}-final-${random_string.suffix.result}"

  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.rds.name

  # Monitoring configuration
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_interval > 0 ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  # Performance Insights
  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_retention_period = 7

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Enhanced monitoring IAM role
  depends_on = [
    aws_iam_role_policy_attachment.rds_enhanced_monitoring
  ]

  tags = {
    Name        = var.db_name
    Environment = "production"
    Terraform   = "true"
  }
}

# Enhanced monitoring IAM role
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0
  name  = "rds-enhanced-monitoring-${random_string.suffix.result}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "rds-monitoring-role"
    Environment = "production"
    Terraform   = "true"
  }
}

# Attach the enhanced monitoring policy to the role
resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count      = var.monitoring_interval > 0 ? 1 : 0
  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch alarms for RDS monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "rds-cpu-utilization-${var.db_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors RDS CPU utilization"
  alarm_actions      = [] # Add SNS topic ARN for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "database_memory" {
  alarm_name          = "rds-freeable-memory-${var.db_name}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "FreeableMemory"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "1000000000" # 1GB in bytes
  alarm_description  = "This metric monitors RDS freeable memory"
  alarm_actions      = [] # Add SNS topic ARN for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "rds-free-storage-${var.db_name}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "FreeStorageSpace"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "5000000000" # 5GB in bytes
  alarm_description  = "This metric monitors RDS free storage space"
  alarm_actions      = [] # Add SNS topic ARN for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.this.id
  }
}