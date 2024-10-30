#!/bin/bash

# AWS ECR Docker Image Build and Push Script
# Version: 1.0.0
# Dependencies: 
# - docker v20.10.7 or higher
# - aws-cli v2.0.0 or higher

# Set strict error handling
set -euo pipefail
IFS=$'\n\t'

# Global variables from specification
AWS_REGION="us-west-2"
ECR_REPOSITORY="my-ecr-repo"
DOCKER_IMAGE_TAG="${DOCKER_IMAGE_TAG:-latest}"

# Configure AWS CLI region
aws configure set default.region ${AWS_REGION}

# Logging function
log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}"
}

# Implementation of buildDockerImage function
# Builds a Docker image using the specified Dockerfile and tags it
buildDockerImage() {
    local dockerfilePath=$1
    local imageTag=$2
    local context_dir=$(dirname "${dockerfilePath}")
    
    log "INFO" "Building Docker image from ${dockerfilePath} with tag ${imageTag}"
    
    # Navigate to the directory containing the Dockerfile
    cd "${context_dir}"
    
    # Build the Docker image
    if docker build \
        --file "${dockerfilePath}" \
        --tag "${imageTag}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VERSION="${DOCKER_IMAGE_TAG}" \
        .; then
        log "INFO" "Successfully built Docker image: ${imageTag}"
        return 0
    else
        log "ERROR" "Failed to build Docker image: ${imageTag}"
        return 1
    fi
}

# Implementation of pushToECR function
# Pushes the built Docker image to AWS ECR
pushToECR() {
    local imageTag=$1
    local accountId=$(aws sts get-caller-identity --query Account --output text)
    local ecrUri="${accountId}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local fullImageTag="${ecrUri}/${ECR_REPOSITORY}:${imageTag}"
    
    log "INFO" "Pushing Docker image to ECR: ${fullImageTag}"
    
    # Authenticate Docker to AWS ECR
    if ! aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "${ecrUri}"; then
        log "ERROR" "Failed to authenticate with ECR"
        return 1
    fi
    
    # Create repository if it doesn't exist
    aws ecr describe-repositories --repository-names "${ECR_REPOSITORY}" || \
        aws ecr create-repository --repository-name "${ECR_REPOSITORY}" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
    
    # Tag the Docker image for ECR
    docker tag "${imageTag}" "${fullImageTag}"
    
    # Push the image to ECR
    if docker push "${fullImageTag}"; then
        log "INFO" "Successfully pushed image to ECR: ${fullImageTag}"
        
        # Verify the push by checking image existence
        if aws ecr describe-images \
            --repository-name "${ECR_REPOSITORY}" \
            --image-ids imageTag="${imageTag}" > /dev/null 2>&1; then
            log "INFO" "Image verification successful"
            return 0
        else
            log "ERROR" "Image verification failed"
            return 1
        fi
    else
        log "ERROR" "Failed to push image to ECR: ${fullImageTag}"
        return 1
    fi
}

# Implementation of cleanupOldImages function
# Removes old images from ECR based on retention policy
cleanupOldImages() {
    local retentionCount=5
    
    log "INFO" "Cleaning up old images in ECR repository: ${ECR_REPOSITORY}"
    
    # List all images in the repository
    local images=$(aws ecr describe-images \
        --repository-name "${ECR_REPOSITORY}" \
        --query 'sort_by(imageDetails,& imagePushedAt)[*].imageDigest' \
        --output text)
    
    # Count total images
    local totalImages=$(echo "${images}" | wc -w)
    
    # If we have more images than retention count, delete the oldest ones
    if [ "${totalImages}" -gt "${retentionCount}" ]; then
        local imagesToDelete=$((totalImages - retentionCount))
        local oldestImages=$(echo "${images}" | tr ' ' '\n' | head -n "${imagesToDelete}")
        
        for imageDigest in ${oldestImages}; do
            log "INFO" "Deleting old image: ${imageDigest}"
            aws ecr batch-delete-image \
                --repository-name "${ECR_REPOSITORY}" \
                --image-ids imageDigest="${imageDigest}"
        done
    fi
}

# Main execution flow
main() {
    local dockerfilePath="infrastructure/docker/Dockerfile"
    
    log "INFO" "Starting Docker build and push process"
    
    # Build Docker image
    if ! buildDockerImage "${dockerfilePath}" "${ECR_REPOSITORY}:${DOCKER_IMAGE_TAG}"; then
        log "ERROR" "Docker build failed"
        exit 1
    fi
    
    # Push to ECR
    if ! pushToECR "${DOCKER_IMAGE_TAG}"; then
        log "ERROR" "ECR push failed"
        exit 1
    fi
    
    # Cleanup old images
    cleanupOldImages
    
    log "INFO" "Build and push process completed successfully"
    
    # Execute health checks after successful push
    if [ -x "$(command -v ./health-check.sh)" ]; then
        log "INFO" "Running health checks"
        ./health-check.sh
    fi
}

# Execute main function
main