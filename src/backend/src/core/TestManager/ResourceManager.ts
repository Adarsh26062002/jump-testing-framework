// External dependencies
// lodash v4.17.21 - For utility functions
import { throttle, cloneDeep } from 'lodash';

// Internal dependencies
import { StateManager } from './StateManager';
import { executeTestFlow } from '../TestExecutor/FlowExecutor';
import { executeParallelFlows } from '../TestExecutor/ParallelExecutor';
import { logMessage } from '../../utils/logger';

// Types
interface Resource {
    id: string;
    type: string;
    status: 'available' | 'allocated' | 'maintenance';
    lastUsed: number;
    metrics: ResourceMetrics;
}

interface ResourceMetrics {
    totalAllocations: number;
    totalUsageTime: number;
    failureCount: number;
    lastAllocationTime?: number;
}

interface ResourceTask {
    id: string;
    type: 'cleanup' | 'maintenance' | 'reallocation';
    resource: Resource;
    scheduledTime: number;
    timeout?: number;
}

interface TestExecution {
    id: string;
    resourceRequirements: {
        type: string;
        count: number;
    }[];
}

// Global configuration from JSON specification
const RESOURCE_MANAGER_CONFIG = {
    maxResources: 100,
    resourceTimeout: 30000,
    allocationTracking: {
        enabled: true,
        metricsInterval: 1000
    }
};

/**
 * ResourceManager class responsible for managing and allocating resources during test execution
 * Implements resource management requirements from system_architecture.component_responsibilities
 */
export class ResourceManager {
    private resourcePool: Map<string, Resource>;
    private resourceConfig: typeof RESOURCE_MANAGER_CONFIG;
    private resourceMetrics: Map<string, ResourceMetrics>;
    private scheduledTasks: Map<string, NodeJS.Timeout>;
    private stateManager: StateManager;

    /**
     * Initialize ResourceManager with configuration and setup monitoring
     * Implements resource initialization as per system_architecture.component_configuration
     */
    constructor() {
        // Initialize storage maps
        this.resourcePool = new Map<string, Resource>();
        this.resourceMetrics = new Map<string, ResourceMetrics>();
        this.scheduledTasks = new Map<string, NodeJS.Timeout>();
        this.resourceConfig = RESOURCE_MANAGER_CONFIG;
        this.stateManager = new StateManager();

        // Initialize resource monitoring if enabled
        if (this.resourceConfig.allocationTracking.enabled) {
            this.initializeResourceMonitoring();
        }

        logMessage('info', 'ResourceManager initialized successfully');
    }

    /**
     * Allocates resources for a test execution
     * Implements resource allocation requirements from system_architecture.test_flow_execution
     * 
     * @param execution - Test execution requiring resources
     * @returns Promise<boolean> indicating if allocation was successful
     */
    public async allocateResources(execution: TestExecution): Promise<boolean> {
        try {
            // Validate execution requirements
            if (!execution.id || !execution.resourceRequirements?.length) {
                throw new Error('Invalid execution configuration');
            }

            // Check resource availability
            const availableResources = this.getAvailableResources();
            for (const requirement of execution.resourceRequirements) {
                const availableCount = availableResources.filter(
                    r => r.type === requirement.type
                ).length;

                if (availableCount < requirement.count) {
                    logMessage('warn', `Insufficient resources of type ${requirement.type}`);
                    return false;
                }
            }

            // Allocate resources
            for (const requirement of execution.resourceRequirements) {
                const resources = availableResources
                    .filter(r => r.type === requirement.type)
                    .slice(0, requirement.count);

                for (const resource of resources) {
                    // Update resource status
                    resource.status = 'allocated';
                    resource.lastUsed = Date.now();
                    resource.metrics.lastAllocationTime = Date.now();
                    resource.metrics.totalAllocations++;

                    // Update resource pool
                    this.resourcePool.set(resource.id, resource);

                    // Schedule cleanup task
                    this.scheduleResourceTask(
                        `cleanup_${resource.id}`,
                        {
                            id: `cleanup_${resource.id}`,
                            type: 'cleanup',
                            resource: cloneDeep(resource),
                            scheduledTime: Date.now() + this.resourceConfig.resourceTimeout
                        },
                        this.resourceConfig.resourceTimeout
                    );

                    // Track metrics
                    this.updateResourceMetrics(resource.id);
                }
            }

            logMessage('info', `Resources allocated for execution ${execution.id}`);
            return true;

        } catch (error) {
            logMessage('error', `Resource allocation failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Releases resources allocated to a test execution
     * Implements resource cleanup requirements from system_architecture.test_flow_execution
     * 
     * @param executionId - ID of the test execution
     */
    public releaseResources(executionId: string): void {
        try {
            // Find resources allocated to this execution
            const allocatedResources = Array.from(this.resourcePool.values())
                .filter(r => r.status === 'allocated');

            for (const resource of allocatedResources) {
                // Update resource status
                resource.status = 'available';
                resource.metrics.totalUsageTime += Date.now() - 
                    (resource.metrics.lastAllocationTime || Date.now());

                // Update resource pool
                this.resourcePool.set(resource.id, resource);

                // Cancel cleanup task
                const cleanupTaskId = `cleanup_${resource.id}`;
                if (this.scheduledTasks.has(cleanupTaskId)) {
                    clearTimeout(this.scheduledTasks.get(cleanupTaskId));
                    this.scheduledTasks.delete(cleanupTaskId);
                }

                // Update metrics
                this.updateResourceMetrics(resource.id);
            }

            logMessage('info', `Resources released for execution ${executionId}`);

        } catch (error) {
            logMessage('error', `Resource release failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Schedules a resource-related task
     * Implements resource task scheduling from system_architecture.component_responsibilities
     * 
     * @param taskId - Unique identifier for the task
     * @param task - Task configuration
     * @param delay - Delay in milliseconds before task execution
     */
    private scheduleResourceTask(taskId: string, task: ResourceTask, delay: number): void {
        try {
            // Cancel existing task if present
            if (this.scheduledTasks.has(taskId)) {
                clearTimeout(this.scheduledTasks.get(taskId));
            }

            // Schedule new task
            const timeoutId = setTimeout(() => {
                this.executeResourceTask(task);
                this.scheduledTasks.delete(taskId);
            }, delay);

            // Store task reference
            this.scheduledTasks.set(taskId, timeoutId);

            logMessage('debug', `Task ${taskId} scheduled for execution in ${delay}ms`);

        } catch (error) {
            logMessage('error', `Task scheduling failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Returns the current status of resources
     * Implements resource monitoring requirements from system_architecture.component_responsibilities
     * 
     * @returns Object containing resource status information
     */
    public getResourceStatus(): object {
        const status = {
            total: this.resourcePool.size,
            available: 0,
            allocated: 0,
            maintenance: 0,
            metrics: {
                totalAllocations: 0,
                totalUsageTime: 0,
                failureCount: 0
            }
        };

        // Compile status from resource pool
        for (const resource of this.resourcePool.values()) {
            status[resource.status]++;
            status.metrics.totalAllocations += resource.metrics.totalAllocations;
            status.metrics.totalUsageTime += resource.metrics.totalUsageTime;
            status.metrics.failureCount += resource.metrics.failureCount;
        }

        return status;
    }

    /**
     * Initializes resource monitoring
     * Implements resource tracking requirements from system_architecture.component_configuration
     */
    private initializeResourceMonitoring(): void {
        // Create throttled update function
        const updateMetrics = throttle(() => {
            for (const resource of this.resourcePool.values()) {
                this.updateResourceMetrics(resource.id);
            }
        }, this.resourceConfig.allocationTracking.metricsInterval);

        // Start periodic updates
        setInterval(updateMetrics, this.resourceConfig.allocationTracking.metricsInterval);
    }

    /**
     * Updates metrics for a specific resource
     * @param resourceId - ID of the resource to update metrics for
     */
    private updateResourceMetrics(resourceId: string): void {
        const resource = this.resourcePool.get(resourceId);
        if (!resource) return;

        const metrics = this.resourceMetrics.get(resourceId) || {
            totalAllocations: 0,
            totalUsageTime: 0,
            failureCount: 0
        };

        // Update metrics
        metrics.totalAllocations = resource.metrics.totalAllocations;
        metrics.totalUsageTime = resource.metrics.totalUsageTime;
        metrics.failureCount = resource.metrics.failureCount;

        this.resourceMetrics.set(resourceId, metrics);
    }

    /**
     * Executes a scheduled resource task
     * @param task - Task to execute
     */
    private async executeResourceTask(task: ResourceTask): Promise<void> {
        try {
            switch (task.type) {
                case 'cleanup':
                    // Release resource if still allocated
                    if (task.resource.status === 'allocated') {
                        task.resource.status = 'available';
                        task.resource.metrics.failureCount++;
                        this.resourcePool.set(task.resource.id, task.resource);
                        logMessage('warn', `Force cleanup of resource ${task.resource.id}`);
                    }
                    break;

                case 'maintenance':
                    // Perform maintenance operations
                    task.resource.status = 'maintenance';
                    this.resourcePool.set(task.resource.id, task.resource);
                    // Schedule resource availability
                    this.scheduleResourceTask(
                        `reallocation_${task.resource.id}`,
                        {
                            id: `reallocation_${task.resource.id}`,
                            type: 'reallocation',
                            resource: task.resource,
                            scheduledTime: Date.now() + 5000
                        },
                        5000
                    );
                    break;

                case 'reallocation':
                    // Make resource available again
                    task.resource.status = 'available';
                    this.resourcePool.set(task.resource.id, task.resource);
                    break;

                default:
                    throw new Error(`Unknown task type: ${task.type}`);
            }
        } catch (error) {
            logMessage('error', `Task execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Returns list of available resources
     * @returns Array of available resources
     */
    private getAvailableResources(): Resource[] {
        return Array.from(this.resourcePool.values())
            .filter(r => r.status === 'available')
            .sort((a, b) => a.lastUsed - b.lastUsed);
    }
}