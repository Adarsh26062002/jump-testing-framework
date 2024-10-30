// External dependencies
// async v3.2.0 - For managing asynchronous operations and task scheduling
import { queue, QueueObject } from 'async';

// Internal dependencies
import { trackExecution } from './StateManager';
import { allocateResources } from './ResourceManager';
import { initializeTracker } from './ExecutionTracker';
import { executeTestFlow } from '../TestExecutor/FlowExecutor';
import { executeParallelFlows } from '../TestExecutor/ParallelExecutor';

// Types
interface Task {
    id: string;
    type: 'sequential' | 'parallel';
    flows: TestFlow[];
    config?: TaskConfig;
}

interface TaskConfig {
    timeout?: number;
    priority?: number;
    resourceRequirements?: {
        cpu?: number;
        memory?: number;
    };
}

interface TestFlow {
    id: string;
    steps: any[];
    config: any;
}

interface TaskStatus {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    error?: Error;
    metrics: {
        startTime: number;
        endTime?: number;
        duration?: number;
        resourceUtilization: {
            cpu: number;
            memory: number;
        };
    };
}

// Global configuration from JSON specification
const TASK_SCHEDULER_CONFIG = {
    maxConcurrentTasks: 10,
    taskTimeout: 30000,
    executionTracking: {
        enabled: true,
        metricsInterval: 1000
    }
};

/**
 * TaskScheduler class responsible for scheduling and managing test execution tasks
 * Implements task scheduling requirements from system_architecture.component_responsibilities
 */
export class TaskScheduler {
    private taskQueue: Map<string, Task>;
    private schedulerConfig: typeof TASK_SCHEDULER_CONFIG;
    private executionQueue: QueueObject<Task>;
    private cleanupInterval: NodeJS.Timeout;
    private metricsInterval: NodeJS.Timeout;

    /**
     * Initialize TaskScheduler with configuration and setup monitoring
     */
    constructor() {
        // Initialize task queue and configuration
        this.taskQueue = new Map<string, Task>();
        this.schedulerConfig = TASK_SCHEDULER_CONFIG;

        // Initialize execution queue with concurrency limit
        this.executionQueue = queue(
            async (task: Task, callback) => {
                try {
                    await this.executeTask(task);
                    callback();
                } catch (error) {
                    callback(error);
                }
            },
            this.schedulerConfig.maxConcurrentTasks
        );

        // Setup cleanup interval for completed tasks
        this.cleanupInterval = setInterval(
            () => this.cleanupCompletedTasks(),
            this.schedulerConfig.taskTimeout
        );

        // Setup metrics tracking if enabled
        if (this.schedulerConfig.executionTracking.enabled) {
            this.metricsInterval = setInterval(
                () => this.updateTaskMetrics(),
                this.schedulerConfig.executionTracking.metricsInterval
            );
        }
    }

    /**
     * Schedule a task for execution
     * Implements task scheduling requirements from system_architecture.test_flow_execution
     */
    public async scheduleTask(task: Task): Promise<void> {
        try {
            // Validate task configuration
            if (!task.id || !task.flows || task.flows.length === 0) {
                throw new Error('Invalid task configuration');
            }

            // Initialize execution tracking
            await initializeTracker();

            // Allocate necessary resources
            const resourcesAllocated = await allocateResources({
                taskId: task.id,
                requirements: task.config?.resourceRequirements
            });

            if (!resourcesAllocated) {
                throw new Error('Failed to allocate resources for task');
            }

            // Add task to queue
            this.taskQueue.set(task.id, task);

            // Track initial state
            trackExecution(task.id, {
                startTime: Date.now(),
                lastUpdateTime: Date.now(),
                currentState: 'pending',
                progress: 0
            });

            // Add to execution queue
            this.executionQueue.push(task);

        } catch (error) {
            throw new Error(`Failed to schedule task: ${error.message}`);
        }
    }

    /**
     * Get current status of all managed tasks
     * Implements task monitoring requirements from system_architecture.component_responsibilities
     */
    public getTaskStatus(): { [taskId: string]: TaskStatus } {
        const status: { [taskId: string]: TaskStatus } = {};

        for (const [taskId, task] of this.taskQueue.entries()) {
            const metrics = {
                startTime: Date.now(),
                resourceUtilization: {
                    cpu: 0,
                    memory: 0
                }
            };

            status[taskId] = {
                id: taskId,
                status: 'pending',
                progress: 0,
                metrics
            };
        }

        return status;
    }

    /**
     * Execute a scheduled task
     * Implements test execution requirements from system_architecture.test_flow_execution
     */
    private async executeTask(task: Task): Promise<void> {
        try {
            // Update task status to running
            trackExecution(task.id, {
                startTime: Date.now(),
                lastUpdateTime: Date.now(),
                currentState: 'running',
                progress: 0
            });

            // Execute based on task type
            if (task.type === 'sequential') {
                for (const flow of task.flows) {
                    await executeTestFlow(flow);
                }
            } else {
                await executeParallelFlows(task.flows);
            }

            // Update task status to completed
            trackExecution(task.id, {
                startTime: Date.now(),
                lastUpdateTime: Date.now(),
                currentState: 'completed',
                progress: 100
            });

        } catch (error) {
            // Update task status to failed
            trackExecution(task.id, {
                startTime: Date.now(),
                lastUpdateTime: Date.now(),
                currentState: 'failed',
                progress: 0,
                error
            });

            throw error;
        }
    }

    /**
     * Clean up completed tasks from the queue
     */
    private cleanupCompletedTasks(): void {
        const now = Date.now();
        for (const [taskId, task] of this.taskQueue.entries()) {
            const status = this.getTaskStatus()[taskId];
            if (status.status === 'completed' || status.status === 'failed') {
                if (now - status.metrics.startTime > this.schedulerConfig.taskTimeout) {
                    this.taskQueue.delete(taskId);
                }
            }
        }
    }

    /**
     * Update metrics for all active tasks
     */
    private updateTaskMetrics(): void {
        for (const [taskId, task] of this.taskQueue.entries()) {
            const status = this.getTaskStatus()[taskId];
            if (status.status === 'running') {
                trackExecution(taskId, {
                    startTime: status.metrics.startTime,
                    lastUpdateTime: Date.now(),
                    currentState: status.status,
                    progress: status.progress
                });
            }
        }
    }
}