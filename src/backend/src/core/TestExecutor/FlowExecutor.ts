// External dependencies
// async v3.2.0 - For managing asynchronous operations
import { queue } from 'async';

// Internal dependencies
import { executeWithRetry } from './RetryHandler';
import { validateGraphQLResponse, validateRESTResponse } from './ResponseValidator';
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

interface TestFlow {
    id: string;
    steps: TestStep[];
    config: FlowConfig;
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
}

// Global configuration from JSON specification
const FLOW_EXECUTION_CONFIG = {
    maxConcurrentFlows: 5,
    defaultTimeout: 30000,
    executionTracking: {
        enabled: true,
        metricsInterval: 1000
    }
};

/**
 * Internal class to track test flow execution metrics and state
 * Implements execution tracking requirements from system_architecture.test_flow_execution
 */
class FlowExecutionTracker {
    private flowMetrics: Map<string, ExecutionMetrics>;
    private flowStates: Map<string, ExecutionState>;

    constructor() {
        this.flowMetrics = new Map();
        this.flowStates = new Map();
    }

    /**
     * Tracks the execution metrics for a flow
     * @param flowId - Unique identifier for the flow
     * @param metrics - Execution metrics to track
     */
    public trackExecution(flowId: string, metrics: ExecutionMetrics): void {
        this.flowMetrics.set(flowId, metrics);
        
        // Update flow state
        const currentState = this.flowStates.get(flowId) || { status: 'pending' };
        if (!currentState.error && metrics.endTime) {
            currentState.status = 'completed';
        }
        this.flowStates.set(flowId, currentState);

        // Log metrics if tracking is enabled
        if (FLOW_EXECUTION_CONFIG.executionTracking.enabled) {
            logMessage('info', `Flow ${flowId} metrics updated: ${JSON.stringify(metrics)}`);
        }
    }

    /**
     * Updates the state of a flow
     * @param flowId - Unique identifier for the flow
     * @param state - New state information
     */
    public updateState(flowId: string, state: Partial<ExecutionState>): void {
        const currentState = this.flowStates.get(flowId) || { status: 'pending' };
        this.flowStates.set(flowId, { ...currentState, ...state });
    }
}

/**
 * Internal class to manage resources for test flow execution
 * Implements resource management requirements from system_architecture.core_testing_components
 */
class FlowResourceManager {
    private allocatedResources: Map<string, any>;

    constructor() {
        this.allocatedResources = new Map();
    }

    /**
     * Allocates a resource for test flow execution
     * @param resourceType - Type of resource to allocate
     * @param resourceConfig - Configuration for the resource
     * @returns Allocated resource
     */
    public async allocateResource(resourceType: string, resourceConfig: any): Promise<any> {
        try {
            // Check resource availability
            if (this.allocatedResources.has(resourceType)) {
                return this.allocatedResources.get(resourceType);
            }

            // Allocate new resource based on type
            let resource: any;
            switch (resourceType) {
                case 'database':
                    resource = await this.initializeDatabaseConnection(resourceConfig);
                    break;
                case 'api':
                    resource = await this.initializeAPIClient(resourceConfig);
                    break;
                default:
                    throw createError('RESOURCE_ERROR', `Unknown resource type: ${resourceType}`);
            }

            // Store allocated resource
            this.allocatedResources.set(resourceType, resource);
            return resource;
        } catch (error) {
            throw createError('RESOURCE_ERROR', `Failed to allocate resource: ${error.message}`);
        }
    }

    private async initializeDatabaseConnection(config: any): Promise<any> {
        // Initialize database connection with retry logic
        return executeWithRetry(async () => {
            return await executeQuery('SELECT 1');
        }, [], { maxAttempts: 3 });
    }

    private async initializeAPIClient(config: any): Promise<any> {
        // Initialize API client with configuration
        return {
            graphql: executeGraphQLQuery,
            rest: makeRequest
        };
    }

    /**
     * Releases allocated resources
     */
    public async releaseResources(): Promise<void> {
        for (const [resourceType, resource] of this.allocatedResources) {
            try {
                if (resourceType === 'database') {
                    await executeQuery('COMMIT');
                }
            } catch (error) {
                logMessage('error', `Failed to release resource ${resourceType}: ${error.message}`);
            }
        }
        this.allocatedResources.clear();
    }
}

/**
 * Executes a test flow, orchestrating the execution of test steps, handling retries, and validating responses
 * Implements test flow execution requirements from system_architecture.test_flow_execution
 * 
 * @param flow - Test flow to execute
 * @returns Promise that resolves when the test flow execution is complete
 */
export async function executeTestFlow(flow: TestFlow): Promise<void> {
    // Initialize tracking and resource management
    const tracker = new FlowExecutionTracker();
    const resourceManager = new FlowResourceManager();

    // Initialize execution metrics
    const metrics: ExecutionMetrics = {
        startTime: Date.now(),
        stepResults: new Map()
    };

    try {
        // Update flow state to running
        tracker.updateState(flow.id, { status: 'running' });

        // Process each step in the flow
        for (const step of flow.steps) {
            // Update current step in state
            tracker.updateState(flow.id, { currentStep: step.id });

            // Execute step with retry logic
            const stepStartTime = Date.now();
            try {
                await executeWithRetry(async () => {
                    // Allocate required resources for the step
                    await resourceManager.allocateResource(step.type, step.config);

                    // Execute step based on type
                    switch (step.type) {
                        case 'graphql':
                            const graphqlResponse = await executeGraphQLQuery(
                                step.config.query,
                                step.config.variables
                            );
                            if (step.validation) {
                                validateGraphQLResponse(graphqlResponse, step.validation);
                            }
                            break;

                        case 'rest':
                            const restResponse = await makeRequest(
                                step.config.method,
                                step.config.url,
                                step.config.data
                            );
                            if (step.validation) {
                                validateRESTResponse(restResponse, step.validation);
                            }
                            break;

                        case 'database':
                            const dbResponse = await executeQuery(
                                step.config.query,
                                step.config.params
                            );
                            // Validate database response if validation is specified
                            if (step.validation && dbResponse.rows) {
                                if (!step.validation(dbResponse.rows)) {
                                    throw createError('VALIDATION_ERROR', 'Database response validation failed');
                                }
                            }
                            break;

                        default:
                            throw createError('FLOW_ERROR', `Unknown step type: ${step.type}`);
                    }
                }, [], flow.config.retryConfig);

                // Record successful step execution
                metrics.stepResults.set(step.id, {
                    success: true,
                    duration: Date.now() - stepStartTime
                });

            } catch (error) {
                // Record failed step execution
                metrics.stepResults.set(step.id, {
                    success: false,
                    duration: Date.now() - stepStartTime,
                    error
                });

                // Update flow state with error
                tracker.updateState(flow.id, { 
                    status: 'failed',
                    error
                });

                throw error;
            }
        }

        // Update final execution metrics
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        tracker.trackExecution(flow.id, metrics);

    } catch (error) {
        // Log flow execution failure
        logMessage('error', `Flow ${flow.id} execution failed: ${error.message}`);
        throw error;

    } finally {
        // Release allocated resources
        await resourceManager.releaseResources();
    }
}