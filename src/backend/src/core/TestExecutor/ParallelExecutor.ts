// External dependencies
// async v3.2.0 - For managing asynchronous operations and parallel execution
import { queue, QueueObject } from 'async';

// Internal dependencies
import { executeTestFlow } from './FlowExecutor';
import { executeWithRetry } from './RetryHandler';
import { StateManager } from '../TestManager/StateManager';
import { executeGraphQLQuery } from '../../services/graphql/client';
import { makeRequest } from '../../services/rest/client';
import { executeQuery } from '../../services/database/client';
import { createError } from '../../utils/errors';
import { logMessage } from '../../utils/logger';

// Types
interface ExecutionMetrics {
    startTime: number;
    endTime?: number;
    duration?: number;
    stepResults: Map<string, StepResult>;
    resourceUtilization: ResourceUtilization;
}

interface ExecutionState {
    status: 'pending' | 'running' | 'completed' | 'failed';
    currentStep?: string;
    error?: Error;
}

interface StepResult {
    success: boolean;
    duration: number;
    error?: Error;
}

interface ResourceUtilization {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
}

interface TestFlow {
    id: string;
    steps: TestStep[];
    config: FlowConfig;
    priority?: number;
}

interface TestStep {
    id: string;
    type: 'graphql' | 'rest' | 'database';
    config: any;
    validation?: any;
}

interface FlowConfig {
    timeout?: number;
    retryConfig?: {
        maxAttempts: number;
        initialDelay: number;
    };
    resourceRequirements?: {
        cpu?: number;
        memory?: number;
        connections?: number;
    };
}

// Global configuration from JSON specification
const PARALLEL_EXECUTION_CONFIG = {
    maxConcurrentFlows: 10,
    defaultTimeout: 30000,
    executionTracking: {
        enabled: true,
        metricsInterval: 1000
    }
};

/**
 * Internal class for managing resources during parallel test execution
 * Implements resource management requirements from system_architecture.core_testing_components
 */
class LocalResourceManager {
    private allocatedResources: Map<string, any>;
    private maxConcurrentResources: number;
    private currentUtilization: ResourceUtilization;

    constructor(maxConcurrent: number) {
        this.allocatedResources = new Map();
        this.maxConcurrentResources = maxConcurrent;
        this.currentUtilization = {
            cpuUsage: 0,
            memoryUsage: 0,
            activeConnections: 0
        };
    }

    /**
     * Allocates resources for a test flow
     */
    public async allocateResource(flowId: string, resourceType: string): Promise<boolean> {
        try {
            // Check if we've reached maximum concurrent resources
            if (this.allocatedResources.size >= this.maxConcurrentResources) {
                return false;
            }

            // Allocate resource based on type
            let resource: any;
            switch (resourceType) {
                case 'database':
                    resource = await executeQuery('SELECT 1');
                    this.currentUtilization.activeConnections++;
                    break;
                case 'api':
                    resource = {
                        graphql: executeGraphQLQuery,
                        rest: makeRequest
                    };
                    break;
                default:
                    throw createError('RESOURCE_ERROR', `Unknown resource type: ${resourceType}`);
            }

            this.allocatedResources.set(flowId, {
                type: resourceType,
                resource
            });

            return true;
        } catch (error) {
            logMessage('error', `Failed to allocate resource for flow ${flowId}: ${error.message}`);
            return false;
        }
    }

    /**
     * Releases allocated resources for a flow
     */
    public async releaseResource(flowId: string): Promise<void> {
        const allocation = this.allocatedResources.get(flowId);
        if (allocation) {
            if (allocation.type === 'database') {
                this.currentUtilization.activeConnections--;
            }
            this.allocatedResources.delete(flowId);
        }
    }

    /**
     * Gets current resource utilization metrics
     */
    public getUtilization(): ResourceUtilization {
        return { ...this.currentUtilization };
    }
}

/**
 * Internal class for tracking execution metrics of parallel test flows
 */
class LocalExecutionTracker {
    private flowMetrics: Map<string, ExecutionMetrics>;
    private flowStates: Map<string, ExecutionState>;
    private stateManager: StateManager;

    constructor(stateManager: StateManager) {
        this.flowMetrics = new Map();
        this.flowStates = new Map();
        this.stateManager = stateManager;
    }

    /**
     * Tracks execution metrics for a flow
     */
    public trackExecution(flowId: string, metrics: ExecutionMetrics): void {
        this.flowMetrics.set(flowId, metrics);
        
        // Update flow state
        const currentState = this.flowStates.get(flowId) || { status: 'pending' };
        if (!currentState.error && metrics.endTime) {
            currentState.status = 'completed';
        }
        this.flowStates.set(flowId, currentState);

        // Update state manager
        this.stateManager.trackExecution(flowId, {
            startTime: metrics.startTime,
            lastUpdateTime: Date.now(),
            currentState: currentState.status,
            progress: metrics.endTime ? 100 : 0
        });

        // Log metrics if tracking is enabled
        if (PARALLEL_EXECUTION_CONFIG.executionTracking.enabled) {
            logMessage('info', `Flow ${flowId} metrics updated: ${JSON.stringify(metrics)}`);
        }
    }

    /**
     * Updates the state of a flow
     */
    public updateState(flowId: string, state: Partial<ExecutionState>): void {
        const currentState = this.flowStates.get(flowId) || { status: 'pending' };
        const newState = { ...currentState, ...state };
        this.flowStates.set(flowId, newState);

        // Update state manager
        this.stateManager.updateState({
            executionId: flowId,
            status: newState.status,
            error: newState.error
        });
    }
}

/**
 * Executes multiple test flows in parallel, managing resources and tracking execution
 * Implements parallel execution requirements from system_architecture.test_flow_execution
 * 
 * @param flows - Array of test flows to execute in parallel
 * @returns Promise that resolves when all parallel test flows are executed
 */
export async function executeParallelFlows(flows: TestFlow[]): Promise<void> {
    // Initialize components
    const stateManager = new StateManager();
    const resourceManager = new LocalResourceManager(PARALLEL_EXECUTION_CONFIG.maxConcurrentFlows);
    const executionTracker = new LocalExecutionTracker(stateManager);

    // Create execution queue with concurrency limit
    const executionQueue: QueueObject<TestFlow> = queue(async (flow: TestFlow, callback) => {
        const metrics: ExecutionMetrics = {
            startTime: Date.now(),
            stepResults: new Map(),
            resourceUtilization: resourceManager.getUtilization()
        };

        try {
            // Initialize flow state
            executionTracker.updateState(flow.id, { status: 'running' });

            // Allocate resources
            const resourceAllocated = await resourceManager.allocateResource(
                flow.id,
                flow.steps[0]?.type || 'api'
            );

            if (!resourceAllocated) {
                throw createError('RESOURCE_ERROR', 'Failed to allocate resources for flow');
            }

            // Execute flow with retry logic
            await executeWithRetry(
                async () => await executeTestFlow(flow),
                [],
                flow.config.retryConfig
            );

            // Update metrics for successful execution
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            executionTracker.trackExecution(flow.id, metrics);

        } catch (error) {
            // Update metrics for failed execution
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            executionTracker.updateState(flow.id, {
                status: 'failed',
                error
            });
            executionTracker.trackExecution(flow.id, metrics);

            logMessage('error', `Flow ${flow.id} execution failed: ${error.message}`);

        } finally {
            // Release allocated resources
            await resourceManager.releaseResource(flow.id);
            callback();
        }
    }, PARALLEL_EXECUTION_CONFIG.maxConcurrentFlows);

    try {
        // Sort flows by priority if specified
        const sortedFlows = flows.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        // Add flows to execution queue
        for (const flow of sortedFlows) {
            // Initialize state for each flow
            stateManager.initializeState({
                id: flow.id,
                status: 'pending'
            });

            // Add to execution queue
            executionQueue.push(flow);
        }

        // Wait for all flows to complete
        await new Promise<void>((resolve, reject) => {
            executionQueue.drain(() => {
                resolve();
            });
            executionQueue.error((err) => {
                reject(err);
            });
        });

    } catch (error) {
        logMessage('error', `Parallel execution failed: ${error.message}`);
        throw createError('EXECUTION_ERROR', `Parallel execution failed: ${error.message}`);
    }
}