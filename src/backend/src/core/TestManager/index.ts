/**
 * TestManager Module Index
 * Responsible for managing test execution, resource allocation, state management, and task scheduling.
 * Requirements addressed:
 * - Test Management (system_architecture.component_responsibilities)
 * - Test Flow Execution (system_architecture.test_flow_execution)
 */

// Export StateManager for managing test execution states
export { StateManager } from './StateManager';

// Export ResourceManager for resource allocation and management
export { ResourceManager } from './ResourceManager';

// Export execution tracking functions
export {
    initializeTracker,
    trackExecutionProgress,
    finalizeExecution
} from './ExecutionTracker';

// Export TaskScheduler for test execution scheduling
export { TaskScheduler } from './TaskScheduler';

// Re-export types that might be needed by consumers
export type {
    TestExecutionState,
    StateTransition,
    ExecutionMetrics
} from './StateManager';

export type {
    Resource,
    ResourceMetrics,
    ResourceTask,
    TestExecution
} from './ResourceManager';

export type {
    Task,
    TaskConfig,
    TestFlow,
    TaskStatus
} from './TaskScheduler';

/**
 * This index file serves as the main entry point for the TestManager module,
 * providing a clean and organized interface for accessing the module's functionality.
 * It implements the following architectural requirements:
 * 
 * 1. State Management: Through StateManager export
 * 2. Resource Management: Through ResourceManager export
 * 3. Execution Tracking: Through ExecutionTracker function exports
 * 4. Task Scheduling: Through TaskScheduler export
 * 
 * The exports are organized to maintain clean separation of concerns while
 * providing all necessary functionality for test execution management.
 */