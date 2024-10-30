# AWS Provider configuration
# Provider version: >= 3.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 3.0"
    }
  }
}

# Variables definition based on the JSON specification
variable "cluster_name" {
  type        = string
  description = "Name of the ECS cluster"
  default     = "test-framework-cluster"
}

variable "service_name" {
  type        = string
  description = "Name of the ECS service"
  default     = "test-framework-service"
}

variable "desired_count" {
  type        = number
  description = "Desired number of tasks"
  default     = 2
}

variable "task_family" {
  type        = string
  description = "Family name for task definition"
  default     = "test-framework-task"
}

# ECS Cluster definition
# Implements: "Create an ECS cluster with the specified name"
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  # Configure cluster capacity providers as per infrastructure.orchestration spec
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
    base            = 1
  }

  # Enable CloudWatch Container Insights for monitoring
  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = terraform.workspace
    Service     = "test-framework"
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${var.cluster_name}"
  retention_in_days = 30
}

# Task Definition
# Implements: "Create an ECS task definition with specified configurations"
resource "aws_ecs_task_definition" "main" {
  family                   = var.task_family
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                     = "2048" # 2 vCPU as per infrastructure.orchestration spec
  memory                  = "4096" # 4GB RAM as per infrastructure.orchestration spec
  execution_role_arn      = aws_iam_role.ecs_execution_role.arn
  task_role_arn          = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name         = "test-runner"
      image        = "${aws_ecr_repository.test_runner.repository_url}:latest"
      essential    = true
      
      # Configure logging as specified
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = "us-west-2"
          "awslogs-stream-prefix" = "test-runner"
        }
      }

      # Container health check
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      # Port mappings
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
    }
  ])
}

# ECS Service
# Implements: "Create an ECS service with specified configurations"
resource "aws_ecs_service" "main" {
  name                               = var.service_name
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.main.arn
  desired_count                     = var.desired_count
  launch_type                       = "FARGATE"
  platform_version                  = "LATEST"
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = data.aws_subnet_ids.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # Service Auto Scaling configuration as per infrastructure.orchestration spec
  service_registries {
    registry_arn = aws_service_discovery_service.main.arn
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "test-runner"
    container_port   = 3000
  }

  # Auto-scaling configuration
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  # Enable ECS Exec for debugging
  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Auto Scaling configuration
# Implements CPU-based scaling as per infrastructure.orchestration spec
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy" {
  name               = "cpu-auto-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0 # Scale when CPU > 70% as per spec
  }
}

# Service Discovery configuration
# Implements: Service Discovery as specified in infrastructure.orchestration
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "test-framework.local"
  vpc         = data.aws_vpc.main.id
  description = "Service Discovery namespace for Test Framework"
}

resource "aws_service_discovery_service" "main" {
  name = var.service_name

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Output values as specified in JSON
output "ecs_cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_service_name" {
  description = "The name of the ECS service"
  value       = aws_ecs_service.main.name
}