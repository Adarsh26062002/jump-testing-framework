#!/bin/bash

# AWS RDS Backup Script
# Version: 1.0.0
# Dependencies: aws-cli v2.0.0 or higher
# Purpose: Automated backup management for AWS RDS instances with verification and cleanup

# Set strict error handling
set -euo pipefail
IFS=$'\n\t'

# Global variables from specification
AWS_REGION="us-west-2"
RDS_INSTANCE_IDENTIFIER="my-rds-instance"
BACKUP_BUCKET="my-backup-bucket"
BACKUP_RETENTION_DAYS=30

# Configure AWS CLI region
aws configure set default.region ${AWS_REGION}

# Logging function
log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}"
}

# Implementation of createRDSBackup function
# Creates a manual snapshot of the specified RDS instance
createRDSBackup() {
    local dbInstanceIdentifier=$1
    local timestamp=$(date +%Y-%m-%d-%H-%M-%S)
    local snapshotIdentifier="${dbInstanceIdentifier}-backup-${timestamp}"
    
    log "INFO" "Initiating backup for RDS instance: ${dbInstanceIdentifier}"
    
    # Create the snapshot
    if aws rds create-db-snapshot \
        --db-instance-identifier "${dbInstanceIdentifier}" \
        --db-snapshot-identifier "${snapshotIdentifier}"; then
        
        log "INFO" "Successfully initiated snapshot: ${snapshotIdentifier}"
        echo "${snapshotIdentifier}"
        return 0
    else
        log "ERROR" "Failed to create snapshot for ${dbInstanceIdentifier}"
        return 1
    fi
}

# Implementation of verifyBackup function
# Verifies the status and availability of a backup snapshot
verifyBackup() {
    local snapshotId=$1
    local maxAttempts=60
    local attempt=1
    
    log "INFO" "Verifying backup snapshot: ${snapshotId}"
    
    while [ $attempt -le $maxAttempts ]; do
        local status=$(aws rds describe-db-snapshots \
            --db-snapshot-identifier "${snapshotId}" \
            --query 'DBSnapshots[0].Status' \
            --output text)
            
        if [ "${status}" == "available" ]; then
            log "INFO" "Snapshot ${snapshotId} successfully verified"
            return 0
        elif [ "${status}" == "failed" ]; then
            log "ERROR" "Snapshot ${snapshotId} failed"
            return 1
        fi
        
        log "INFO" "Snapshot status: ${status}, attempt ${attempt}/${maxAttempts}"
        sleep 30
        ((attempt++))
    done
    
    log "ERROR" "Timeout waiting for snapshot ${snapshotId} to become available"
    return 1
}

# Implementation of cleanupOldBackups function
# Removes snapshots older than the retention period
cleanupOldBackups() {
    local dbInstanceIdentifier=$1
    local retentionDays=$2
    local cutoffDate=$(date -d "${retentionDays} days ago" +%s)
    
    log "INFO" "Cleaning up old snapshots for ${dbInstanceIdentifier}"
    
    # List all manual snapshots for the instance
    local snapshots=$(aws rds describe-db-snapshots \
        --db-instance-identifier "${dbInstanceIdentifier}" \
        --snapshot-type manual \
        --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
        --output text)
    
    while read -r snapshot; do
        local snapshotId=$(echo "${snapshot}" | cut -f1)
        local createTime=$(echo "${snapshot}" | cut -f2)
        local createTimestamp=$(date -d "${createTime}" +%s)
        
        if [ "${createTimestamp}" -lt "${cutoffDate}" ]; then
            log "INFO" "Deleting old snapshot: ${snapshotId}"
            if aws rds delete-db-snapshot --db-snapshot-identifier "${snapshotId}"; then
                log "INFO" "Successfully deleted snapshot: ${snapshotId}"
            else
                log "ERROR" "Failed to delete snapshot: ${snapshotId}"
            fi
        fi
    done <<< "${snapshots}"
}

# Implementation of notifyBackupStatus function
# Sends backup status to CloudWatch and SNS
notifyBackupStatus() {
    local snapshotId=$1
    local status=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Send metric to CloudWatch
    aws cloudwatch put-metric-data \
        --namespace "RDSBackups" \
        --metric-name "BackupStatus" \
        --value "$([[ "${status}" == "SUCCESS" ]] && echo 1 || echo 0)" \
        --timestamp "${timestamp}" \
        --dimensions "SnapshotId=${snapshotId}"
    
    # Create detailed message
    local message="RDS Backup Status
Snapshot ID: ${snapshotId}
Status: ${status}
Timestamp: ${timestamp}
Instance: ${RDS_INSTANCE_IDENTIFIER}
Region: ${AWS_REGION}"
    
    # Send to CloudWatch Logs
    aws logs put-log-events \
        --log-group-name "/aws/rds/backups" \
        --log-stream-name "${RDS_INSTANCE_IDENTIFIER}" \
        --log-events timestamp=$(date +%s%3N),message="${message}"
}

# Main execution flow
main() {
    log "INFO" "Starting RDS backup process"
    
    # Create backup
    local snapshotId=$(createRDSBackup "${RDS_INSTANCE_IDENTIFIER}")
    if [ $? -ne 0 ]; then
        notifyBackupStatus "${snapshotId}" "FAILED"
        exit 1
    fi
    
    # Verify backup
    if ! verifyBackup "${snapshotId}"; then
        notifyBackupStatus "${snapshotId}" "FAILED"
        exit 1
    fi
    
    # Cleanup old backups
    cleanupOldBackups "${RDS_INSTANCE_IDENTIFIER}" "${BACKUP_RETENTION_DAYS}"
    
    # Notify success
    notifyBackupStatus "${snapshotId}" "SUCCESS"
    log "INFO" "Backup process completed successfully"
}

# Execute main function
main