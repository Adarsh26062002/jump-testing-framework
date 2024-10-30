# AWS Provider configuration (>= 3.0)
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 3.0"
    }
    datadog = {
      source  = "DataDog/datadog"
      version = ">= 2.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  # Provider configuration will be inherited from the parent module
}

# Configure the Datadog Provider
provider "datadog" {
  api_key = var.datadog_api_key
}

# CloudWatch Dashboard for system monitoring
# Implements monitoring requirements from infrastructure.infrastructure_monitoring
resource "aws_cloudwatch_dashboard" "system_monitoring" {
  dashboard_name = var.cloudwatch_dashboard_name
  dashboard_body = file("${path.module}/../../monitoring/cloudwatch-dashboard.json")
}

# SNS Topic for monitoring alerts
resource "aws_sns_topic" "monitoring_alerts" {
  name = "monitoring-alerts-${var.environment}"
}

# CloudWatch Alarms for Test Execution Monitoring
resource "aws_cloudwatch_metric_alarm" "high_test_execution_duration" {
  alarm_name          = "high-test-execution-duration-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TestExecutionDuration"
  namespace           = "TestFramework"
  period             = 300
  statistic          = "Average"
  threshold          = 300
  alarm_description  = "High test execution duration detected"
  alarm_actions      = [aws_sns_topic.monitoring_alerts.arn]

  dimensions = {
    Type = "Flow"
  }
}

# CloudWatch Alarms for API Integration Monitoring
resource "aws_cloudwatch_metric_alarm" "high_api_latency" {
  alarm_name          = "high-api-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ResponseTime"
  namespace           = "APIIntegration"
  period             = 300
  statistic          = "Average"
  threshold          = 1000
  alarm_description  = "High API latency detected"
  alarm_actions      = [aws_sns_topic.monitoring_alerts.arn]

  dimensions = {
    Endpoint = "GraphQL"
  }
}

# CloudWatch Alarms for Database Monitoring
resource "aws_cloudwatch_metric_alarm" "database_connection_failure" {
  alarm_name          = "database-connection-failure-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConnectionCount"
  namespace           = "DatabaseClient"
  period             = 300
  statistic          = "Average"
  threshold          = 1
  alarm_description  = "Database connection failure detected"
  alarm_actions      = [aws_sns_topic.monitoring_alerts.arn]

  dimensions = {
    Database = "Events"
  }
}

# CloudWatch Alarms for Resource Utilization
resource "aws_cloudwatch_metric_alarm" "high_cpu_usage" {
  alarm_name          = "high-cpu-usage-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "TestFramework"
  period             = 300
  statistic          = "Average"
  threshold          = 80
  alarm_description  = "High CPU usage detected"
  alarm_actions      = [aws_sns_topic.monitoring_alerts.arn]
}

# Datadog Monitor for High CPU Usage
resource "datadog_monitor" "high_cpu_usage" {
  name    = "High CPU Usage - ${var.environment}"
  type    = "metric alert"
  message = "High CPU usage detected in ${var.environment} environment. Please investigate."
  
  query = "avg(last_5m):avg:aws.ec2.cpuutilization{environment:${var.environment}} > 80"
  
  monitor_thresholds {
    critical = 80
    warning  = 70
  }

  notify_no_data    = false
  renotify_interval = 60

  tags = ["environment:${var.environment}"]
}

# Datadog Monitor for API Latency
resource "datadog_monitor" "api_latency" {
  name    = "High API Latency - ${var.environment}"
  type    = "metric alert"
  message = "High API latency detected in ${var.environment} environment. Please investigate."
  
  query = "avg(last_5m):avg:apiintegration.response_time{environment:${var.environment}} > 1000"
  
  monitor_thresholds {
    critical = 1000
    warning  = 800
  }

  notify_no_data    = false
  renotify_interval = 60

  tags = ["environment:${var.environment}"]
}

# Datadog Monitor for Database Connections
resource "datadog_monitor" "database_connections" {
  name    = "Database Connection Issues - ${var.environment}"
  type    = "metric alert"
  message = "Database connection issues detected in ${var.environment} environment. Please investigate."
  
  query = "min(last_5m):avg:databaseclient.connection_count{environment:${var.environment}} < 1"
  
  monitor_thresholds {
    critical = 1
    warning  = 2
  }

  notify_no_data    = true
  renotify_interval = 30

  tags = ["environment:${var.environment}"]
}

# Datadog Monitor for Test Execution Duration
resource "datadog_monitor" "test_execution_duration" {
  name    = "High Test Execution Duration - ${var.environment}"
  type    = "metric alert"
  message = "Test execution duration is too high in ${var.environment} environment. Please investigate."
  
  query = "avg(last_5m):avg:testframework.execution_duration{environment:${var.environment}} > 300"
  
  monitor_thresholds {
    critical = 300
    warning  = 240
  }

  notify_no_data    = false
  renotify_interval = 60

  tags = ["environment:${var.environment}"]
}