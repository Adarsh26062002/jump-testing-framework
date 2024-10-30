// External dependencies
// async v3.2.0 - For managing asynchronous operations and parallel execution
import { queue } from 'async';

// Internal dependencies
import { executeTestFlow } from './FlowExecutor';
import { executeParallelFlows } from './ParallelExecutor';
import { executeWithRetry } from './RetryHandler';
import { validateGraphQLResponse, validateRESTResponse } from './ResponseValidator';
import { logMessage } from '../../utils/logger';
import { createError } from '../../utils/errors';

// Types
interface TestExecutorConfig {
    maxConcurrentFlows: number;
    defaultTimeout: number;
    executionTracking: {
        enabled: boolean;
        metricsInterval: number;
    };
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
}

// Global configuration from JSON specification
const EXECUTION_CONFIG: TestExecutorConfig = {
    maxConcurrentFlows: 10,
    defaultTimeout: 30000,
    executionTracking: {
        enabled: true,
        metricsInterval: 1000
    }
};

/**
 * Class to manage the Test Executor's state and configuration
 * Implements requirements from system_architecture.test_flow_execution
 */
class TestExecutorManager {
    private static instance: TestExecutorManager;
    private initialized: boolean = false;
    private config: TestExecutorConfig;
    private activeFlows: Map<string, TestFlow>;

    private constructor() {
        this.config = EXECUTION_CONFIG;
        this.activeFlows = new Map();
    }

    /**
     * Gets the singleton instance of TestExecutorManager
     */
    public static getInstance(): TestExecutorManager {
        if (!TestExecutorManager.instance) {
            TestExecutorManager.instance = new TestExecutorManager();
        }
        return TestExecutorManager.instance;
    }

    /**
     * Initializes the Test Executor with provided configuration
     * @param config - Optional configuration overrides
     */
    public initialize(config?: Partial<TestExecutorConfig>): void {
        if (this.initialized) {
            throw createError('INITIALIZATION_ERROR', 'Test Executor is already initialized');
        }

        try {
            // Merge provided config with defaults
            this.config = {
                ...EXECUTION_CONFIG,
                ...config
            };

            // Validate configuration
            this.validateConfig();

            // Set up execution tracking if enabled
            if (this.config.executionTracking.enabled) {
                this.setupExecutionTracking();
            }

            this.initialized = true;
            logMessage('info', 'Test Executor initialized successfully');

        } catch (error) {
            logMessage('error', `Test Executor initialization failed: ${error.message}`);
            throw createError('INITIALIZATION_ERROR', `Failed to initialize Test Executor: ${error.message}`);
        }
    }

    /**
     * Validates the Test Executor configuration
     */
    private validateConfig(): void {
        if (this.config.maxConcurrentFlows <= 0) {
            throw createError('CONFIG_ERROR', 'maxConcurrentFlows must be greater than 0');
        }

        if (this.config.defaultTimeout <= 0) {
            throw createError('CONFIG_ERROR', 'defaultTimeout must be greater than 0');
        }

        if (this.config.executionTracking.metricsInterval <= 0) {
            throw createError('CONFIG_ERROR', 'metricsInterval must be greater than 0');
        }
    }

    /**
     * Sets up execution tracking for monitoring test flows
     */
    private setupExecutionTracking(): void {
        const interval = setInterval(() => {
            const activeFlowCount = this.activeFlows.size;
            const executionMetrics = {
                timestamp: Date.now(),
                activeFlows: activeFlowCount,
                maxConcurrent: this.config.maxConcurrentFlows,
                utilizationPercentage: (activeFlowCount / this.config.maxConcurrentFlows) * 100
            };

            logMessage('info', `Execution metrics: ${JSON.stringify(executionMetrics)}`);
        }, this.config.executionTracking.metricsInterval);

        // Ensure interval is cleared if the process exits
        process.on('beforeExit', () => {
            clearInterval(interval);
        });
    }

    /**
     * Tracks an active test flow
     */
    public trackFlow(flow: TestFlow): void {
        this.activeFlows.set(flow.id, flow);
    }

    /**
     * Removes a completed test flow from tracking
     */
    public untrackFlow(flowId: string): void {
        this.activeFlows.delete(flowId);
    }

    /**
     * Gets the current Test Executor configuration
     */
    public getConfig(): TestExecutorConfig {
        return { ...this.config };
    }

    /**
     * Checks if the Test Executor is initialized
     */
    public isInitialized(): boolean {
        return this.initialized;
    }
}

/**
 * Initializes the Test Executor component
 * Implements initialization requirements from system_architecture.core_testing_components
 */
export function initializeTestExecutor(): void {
    const executor = TestExecutorManager.getInstance();
    
    if (!executor.isInitialized()) {
        executor.initialize();
    }
}

/**
 * Executes a single test flow with retry capabilities
 * Implements test flow execution requirements from system_architecture.test_flow_execution
 * 
 * @param flow - Test flow to execute
 */
export async function executeFlow(flow: TestFlow): Promise<void> {
    const executor = TestExecutorManager.getInstance();
    
    if (!executor.isInitialized()) {
        throw createError('EXECUTION_ERROR', 'Test Executor must be initialized before executing flows');
    }

    try {
        // Track the flow
        executor.trackFlow(flow);

        // Execute the flow with retry logic
        await executeWithRetry(
            async () => await executeTestFlow(flow),
            [],
            flow.config.retryConfig
        );

    } catch (error) {
        logMessage('error', `Flow execution failed: ${error.message}`);
        throw error;

    } finally {
        // Remove flow from tracking
        executor.untrackFlow(flow.id);
    }
}

/**
 * Executes multiple test flows in parallel
 * Implements parallel execution requirements from system_architecture.test_flow_execution
 * 
 * @param flows - Array of test flows to execute
 */
export async function executeFlows(flows: TestFlow[]): Promise<void> {
    const executor = TestExecutorManager.getInstance();
    
    if (!executor.isInitialized()) {
        throw createError('EXECUTION_ERROR', 'Test Executor must be initialized before executing flows');
    }

    try {
        // Execute flows in parallel using ParallelExecutor
        await executeParallelFlows(flows);

    } catch (error) {
        logMessage('error', `Parallel flow execution failed: ${error.message}`);
        throw createError('EXECUTION_ERROR', `Failed to execute flows in parallel: ${error.message}`);
    }
}

/**
 * Validates a test response based on its type
 * Implements validation requirements from system_architecture.core_testing_components
 * 
 * @param response - Response to validate
 * @param type - Type of response (graphql or rest)
 * @param schema - Validation schema
 */
export function validateResponse(
    response: any,
    type: 'graphql' | 'rest',
    schema: any
): boolean {
    try {
        return type === 'graphql'
            ? validateGraphQLResponse(response, schema)
            : validateRESTResponse(response, schema);
    } catch (error) {
        logMessage('error', `Response validation failed: ${error.message}`);
        throw error;
    }
}