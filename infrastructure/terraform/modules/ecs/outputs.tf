# Terraform ECS Module Outputs
# This file defines the outputs for the ECS infrastructure module
# Provider version: >= 3.0 (inherited from main.tf)

# Implements requirement: ECS Infrastructure Outputs
# Provides access to key ECS infrastructure information for other modules

# The ID of the ECS cluster
# This output exposes the unique identifier of the created ECS cluster
# Used by other modules to reference this cluster
output "ecs_cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

# The name of the ECS service
# This output exposes the name of the created ECS service
# Used for service discovery and cross-module references
output "ecs_service_name" {
  description = "The name of the ECS service"
  value       = aws_ecs_service.main.name
}