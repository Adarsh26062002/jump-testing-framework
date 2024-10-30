#!/bin/bash

# AWS Infrastructure Health Check Script
# Version: 1.0.0
# Dependencies: aws-cli v2.0.0 or higher
# Purpose: Comprehensive health monitoring of AWS infrastructure components

# Set strict error handling
set -euo pipefail
IFS=$'\n\t'

# Global variables from specification
AWS_REGION="us-west-2"
HEALTH_CHECK_INTERVAL="300"
ALERT_SNS_TOPIC="infrastructure-alerts"

# Configure AWS CLI region
aws configure set default.region ${AWS_REGION}

# Logging function
log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}"
}

# Implementation of checkEC2Instances function
# Checks the health status of EC2 instances
checkEC2Instances() {
    local instanceIds=$1
    local healthy=true
    
    log "INFO" "Checking EC2 instances health: ${instanceIds}"
    
    # Get instance statuses
    local instances=$(aws ec2 describe-instance-status \
        --instance-ids ${instanceIds} \
        --include-all-instances \
        --query 'InstanceStatuses[*].[InstanceId,InstanceState.Name,SystemStatus.Status,InstanceStatus.Status]' \
        --output text)
    
    while read -r instance; do
        local instanceId=$(echo "${instance}" | cut -f1)
        local state=$(echo "${instance}" | cut -f2)
        local systemStatus=$(echo "${instance}" | cut -f3)
        local instanceStatus=$(echo "${instance}" | cut -f4)
        
        # Check instance state
        if [ "${state}" != "running" ]; then
            log "ERROR" "Instance ${instanceId} is not running (State: ${state})"
            healthy=false
            continue
        fi
        
        # Check system and instance status
        if [ "${systemStatus}" != "ok" ] || [ "${instanceStatus}" != "ok" ]; then
            log "ERROR" "Instance ${instanceId} health check failed (System: ${systemStatus}, Instance: ${instanceStatus})"
            healthy=false
            continue
        fi
        
        # Get CPU utilization metrics
        local cpuUtilization=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/EC2 \
            --metric-name CPUUtilization \
            --dimensions Name=InstanceId,Value=${instanceId} \
            --start-time $(date -u -v-5M '+%Y-%m-%dT%H:%M:%SZ') \
            --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
            --period 300 \
            --statistics Average \
            --query 'Datapoints[0].Average' \
            --output text)
        
        # Check if CPU utilization is too high (>90%)
        if [ $(echo "${cpuUtilization} > 90" | bc -l) -eq 1 ]; then
            log "WARNING" "Instance ${instanceId} has high CPU utilization: ${cpuUtilization}%"
            sendHealthAlert "High CPU utilization on instance ${instanceId}: ${cpuUtilization}%" "WARNING"
        fi
        
        log "INFO" "Instance ${instanceId} is healthy"
    done <<< "${instances}"
    
    $healthy
}

# Implementation of checkRDSInstances function
# Verifies the operational status of RDS instances
checkRDSInstances() {
    local dbInstanceIdentifiers=$1
    local healthy=true
    
    log "INFO" "Checking RDS instances health: ${dbInstanceIdentifiers}"
    
    for dbIdentifier in ${dbInstanceIdentifiers}; do
        # Get instance status
        local dbStatus=$(aws rds describe-db-instances \
            --db-instance-identifier "${dbIdentifier}" \
            --query 'DBInstances[0].[DBInstanceStatus,PendingModifiedValues,MaintenanceWindow]' \
            --output text)
        
        local status=$(echo "${dbStatus}" | cut -f1)
        local pendingChanges=$(echo "${dbStatus}" | cut -f2)
        local maintenanceWindow=$(echo "${dbStatus}" | cut -f3)
        
        # Check instance availability
        if [ "${status}" != "available" ]; then
            log "ERROR" "RDS instance ${dbIdentifier} is not available (Status: ${status})"
            healthy=false
            continue
        fi
        
        # Check for pending changes
        if [ "${pendingChanges}" != "None" ]; then
            log "WARNING" "RDS instance ${dbIdentifier} has pending modifications: ${pendingChanges}"
            sendHealthAlert "RDS instance ${dbIdentifier} has pending changes: ${pendingChanges}" "WARNING"
        fi
        
        # Check connection endpoint
        if ! aws rds describe-db-instances \
            --db-instance-identifier "${dbIdentifier}" \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text > /dev/null 2>&1; then
            log "ERROR" "Unable to resolve endpoint for RDS instance ${dbIdentifier}"
            healthy=false
            continue
        fi
        
        log "INFO" "RDS instance ${dbIdentifier} is healthy"
    done
    
    $healthy
}

# Implementation of checkECSServices function
# Monitors the health of ECS services and tasks
checkECSServices() {
    local clusterName=$1
    local healthy=true
    
    log "INFO" "Checking ECS services health in cluster: ${clusterName}"
    
    # List all services in the cluster
    local services=$(aws ecs list-services \
        --cluster "${clusterName}" \
        --query 'serviceArns[]' \
        --output text)
    
    for service in ${services}; do
        # Get service details
        local serviceDetails=$(aws ecs describe-services \
            --cluster "${clusterName}" \
            --services "${service}" \
            --query 'services[0].[serviceName,desiredCount,runningCount,pendingCount,events[0].message]' \
            --output text)
        
        local serviceName=$(echo "${serviceDetails}" | cut -f1)
        local desiredCount=$(echo "${serviceDetails}" | cut -f2)
        local runningCount=$(echo "${serviceDetails}" | cut -f3)
        local pendingCount=$(echo "${serviceDetails}" | cut -f4)
        local lastEvent=$(echo "${serviceDetails}" | cut -f5)
        
        # Check if desired count matches running count
        if [ "${desiredCount}" != "${runningCount}" ]; then
            log "ERROR" "Service ${serviceName} has mismatched task counts (Desired: ${desiredCount}, Running: ${runningCount})"
            healthy=false
            sendHealthAlert "ECS service ${serviceName} task count mismatch" "CRITICAL"
        fi
        
        # Check for pending tasks
        if [ "${pendingCount}" != "0" ]; then
            log "WARNING" "Service ${serviceName} has ${pendingCount} pending tasks"
            sendHealthAlert "ECS service ${serviceName} has pending tasks: ${pendingCount}" "WARNING"
        fi
        
        # Check recent events for issues
        if [[ "${lastEvent}" == *"error"* ]] || [[ "${lastEvent}" == *"failed"* ]]; then
            log "ERROR" "Service ${serviceName} has recent issues: ${lastEvent}"
            healthy=false
            sendHealthAlert "ECS service ${serviceName} event: ${lastEvent}" "CRITICAL"
        fi
        
        log "INFO" "ECS service ${serviceName} health check completed"
    done
    
    $healthy
}

# Implementation of sendHealthAlert function
# Sends health status alerts to SNS topic
sendHealthAlert() {
    local message=$1
    local severity=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Format the alert message
    local formattedMessage="Infrastructure Health Alert
Severity: ${severity}
Timestamp: ${timestamp}
Message: ${message}
Region: ${AWS_REGION}"
    
    # Send to SNS
    aws sns publish \
        --topic-arn "${ALERT_SNS_TOPIC}" \
        --message "${formattedMessage}" \
        --subject "Infrastructure Health Alert - ${severity}"
    
    # Log to CloudWatch
    aws logs put-log-events \
        --log-group-name "/aws/infrastructure/health-checks" \
        --log-stream-name "health-alerts" \
        --log-events timestamp=$(date +%s%3N),message="${formattedMessage}"
    
    log "INFO" "Alert sent: ${message} (Severity: ${severity})"
}

# Main execution flow
main() {
    log "INFO" "Starting infrastructure health check"
    
    # Get list of resources to check
    local ec2Instances=$(aws ec2 describe-instances \
        --filters "Name=instance-state-name,Values=running" \
        --query 'Reservations[*].Instances[*].InstanceId' \
        --output text)
    
    local rdsInstances=$(aws rds describe-db-instances \
        --query 'DBInstances[*].DBInstanceIdentifier' \
        --output text)
    
    local ecsClusters=$(aws ecs list-clusters \
        --query 'clusterArns[]' \
        --output text)
    
    # Check EC2 instances
    if ! checkEC2Instances "${ec2Instances}"; then
        sendHealthAlert "EC2 instances health check failed" "CRITICAL"
    fi
    
    # Check RDS instances
    if ! checkRDSInstances "${rdsInstances}"; then
        sendHealthAlert "RDS instances health check failed" "CRITICAL"
    fi
    
    # Check ECS services
    for cluster in ${ecsClusters}; do
        if ! checkECSServices "${cluster}"; then
            sendHealthAlert "ECS services health check failed for cluster: ${cluster}" "CRITICAL"
        fi
    done
    
    log "INFO" "Infrastructure health check completed"
}

# Execute main function
main