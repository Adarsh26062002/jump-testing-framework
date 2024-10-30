/**
 * StateManager Implementation
 * Responsible for maintaining and managing test execution states
 * Requirements addressed:
 * - State Management (system_architecture.component_responsibilities)
 * - Test Flow Execution (system_architecture.test_flow_execution)
 */

// External dependencies
// winston v3.3.3 - For logging capabilities
import * as winston from 'winston';

// Internal dependencies
import { TestCase } from '../../types/test.types';
import { logMessage } from '../../utils/logger';
import { createError } from '../../utils/errors';

/**
 * Interface for state transition configuration
 */
interface StateTransition {
    fromState: string;
    toState: string;
    timeout?: number;
    condition?: () => boolean;
}

/**
 * Interface for execution metrics
 */
interface ExecutionMetrics {
    startTime: number;
    lastUpdateTime: number;
    currentState: string;
    progress: number;
    errors: number;
}

/**
 * Interface for test execution state
 */
interface TestExecutionState {
    executionId: string;
    status: string;
    startTime: number;
    lastUpdateTime: number;
    metrics: ExecutionMetrics;
}

/**
 * StateManager class responsible for maintaining test execution states
 */
export class StateManager {
    private stateStore: Map<string, TestExecutionState>;
    private stateConfig: typeof STATE_MANAGER_CONFIG;
    private executionMetrics: Map<string, ExecutionMetrics>;
    private transitionQueue: Map<string, StateTransition>;
    private cleanupInterval: NodeJS.Timeout;
    private metricsInterval: NodeJS.Timeout;

    /**
     * Initialize StateManager with configuration and setup intervals
     */
    constructor() {
        // Initialize storage maps
        this.stateStore = new Map<string, TestExecutionState>();
        this.executionMetrics = new Map<string, ExecutionMetrics>();
        this.transitionQueue = new Map<string, StateTransition>();

        // Set configuration
        this.stateConfig = STATE_MANAGER_CONFIG;

        // Setup cleanup interval for stale states
        this.cleanupInterval = setInterval(
            () => this.cleanupStaleState(),
            this.stateConfig.stateRetention * 1000
        );

        // Setup metrics tracking if enabled
        if (this.stateConfig.executionTracking.enabled) {
            this.metricsInterval = setInterval(
                () => this.updateMetrics(),
                this.stateConfig.executionTracking.metricsInterval
            );
        }

        logMessage('info', 'StateManager initialized successfully');
    }

    /**
     * Initialize state for a new test execution
     */
    public initializeState(execution: TestCase): boolean {
        try {
            // Validate execution object
            if (!execution.id || !execution.status) {
                throw createError('VALIDATION_ERROR', 'Invalid execution configuration');
            }

            // Create initial state
            const initialState: TestExecutionState = {
                executionId: execution.id,
                status: 'INITIALIZED',
                startTime: Date.now(),
                lastUpdateTime: Date.now(),
                metrics: {
                    startTime: Date.now(),
                    lastUpdateTime: Date.now(),
                    currentState: 'INITIALIZED',
                    progress: 0,
                    errors: 0
                }
            };

            // Store state
            this.stateStore.set(execution.id, initialState);
            this.executionMetrics.set(execution.id, initialState.metrics);

            logMessage('debug', `State initialized for execution ${execution.id}`);
            return true;
        } catch (error) {
            logMessage('error', `Failed to initialize state: ${error.message}`);
            return false;
        }
    }

    /**
     * Update state based on test results
     */
    public updateState(result: { executionId: string; status: string; error?: any }): void {
        try {
            const currentState = this.stateStore.get(result.executionId);
            if (!currentState) {
                throw createError('VALIDATION_ERROR', `No state found for execution ${result.executionId}`);
            }

            // Update state
            currentState.status = result.status;
            currentState.lastUpdateTime = Date.now();
            
            // Update metrics
            const metrics = this.executionMetrics.get(result.executionId);
            if (metrics) {
                metrics.lastUpdateTime = Date.now();
                metrics.currentState = result.status;
                if (result.error) metrics.errors++;
            }

            // Store updated state
            this.stateStore.set(result.executionId, currentState);
            
            logMessage('debug', `State updated for execution ${result.executionId}: ${result.status}`);
        } catch (error) {
            logMessage('error', `Failed to update state: ${error.message}`);
            throw error;
        }
    }

    /**
     * Schedule state transition
     */
    public async scheduleStateTransition(
        executionId: string,
        transition: StateTransition
    ): Promise<void> {
        try {
            // Validate transition
            if (!transition.fromState || !transition.toState) {
                throw createError('VALIDATION_ERROR', 'Invalid transition configuration');
            }

            // Add to transition queue
            this.transitionQueue.set(executionId, transition);

            // Setup timeout if specified
            if (transition.timeout) {
                setTimeout(() => {
                    this.processTransition(executionId);
                }, transition.timeout);
            }

            logMessage('debug', `State transition scheduled for ${executionId}`);
        } catch (error) {
            logMessage('error', `Failed to schedule transition: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get current state for execution
     */
    public getCurrentState(executionId: string): TestExecutionState | null {
        try {
            const state = this.stateStore.get(executionId);
            if (!state) {
                logMessage('warn', `No state found for execution ${executionId}`);
                return null;
            }
            return state;
        } catch (error) {
            logMessage('error', `Failed to get current state: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean up stale state entries
     */
    private cleanupStaleState(): void {
        try {
            const now = Date.now();
            const retentionPeriod = this.stateConfig.stateRetention * 1000;

            // Identify and remove stale entries
            for (const [executionId, state] of this.stateStore.entries()) {
                if (now - state.lastUpdateTime > retentionPeriod) {
                    this.stateStore.delete(executionId);
                    this.executionMetrics.delete(executionId);
                    this.transitionQueue.delete(executionId);
                }
            }

            logMessage('debug', 'Stale state cleanup completed');
        } catch (error) {
            logMessage('error', `Failed to cleanup stale state: ${error.message}`);
        }
    }

    /**
     * Track execution progress and update metrics
     */
    public trackExecution(executionId: string, metrics: Partial<ExecutionMetrics>): void {
        try {
            const currentMetrics = this.executionMetrics.get(executionId);
            if (!currentMetrics) {
                throw createError('VALIDATION_ERROR', `No metrics found for execution ${executionId}`);
            }

            // Update metrics
            Object.assign(currentMetrics, metrics, {
                lastUpdateTime: Date.now()
            });

            this.executionMetrics.set(executionId, currentMetrics);

            // Process any pending transitions
            if (this.transitionQueue.has(executionId)) {
                this.processTransition(executionId);
            }

            if (this.stateConfig.logLevel === 'debug') {
                logMessage('debug', `Execution metrics updated for ${executionId}`);
            }
        } catch (error) {
            logMessage('error', `Failed to track execution: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process pending state transition
     */
    private processTransition(executionId: string): void {
        const transition = this.transitionQueue.get(executionId);
        if (!transition) return;

        const currentState = this.getCurrentState(executionId);
        if (!currentState) return;

        if (currentState.status === transition.fromState &&
            (!transition.condition || transition.condition())) {
            this.updateState({
                executionId,
                status: transition.toState
            });
            this.transitionQueue.delete(executionId);
        }
    }

    /**
     * Update metrics for all active executions
     */
    private updateMetrics(): void {
        try {
            for (const [executionId, metrics] of this.executionMetrics.entries()) {
                if (Date.now() - metrics.lastUpdateTime > this.stateConfig.executionTracking.metricsInterval) {
                    this.trackExecution(executionId, {
                        lastUpdateTime: Date.now()
                    });
                }
            }
        } catch (error) {
            logMessage('error', `Failed to update metrics: ${error.message}`);
        }
    }
}