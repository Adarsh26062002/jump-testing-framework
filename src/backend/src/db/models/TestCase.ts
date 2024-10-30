// External dependencies
import { Client } from 'pg'; // v8.5.1

// Internal dependencies
import { TestSuite } from './TestSuite';
import { TestData } from './TestData';
import { DatabaseModel } from '../../types/db.types';

/**
 * TestCase class representing a single test case within a test suite
 * Implements the TestCase schema defined in system_design.database_design.test_data_storage
 */
export class TestCase implements DatabaseModel {
    // Base model fields from DatabaseModel
    public id: string;
    public createdAt: Date;
    public updatedAt: Date;

    // TestCase specific fields as per database schema
    public suiteId: string;
    public name: string;
    public flowType: string;
    public config: Record<string, any>;
    public status: string;

    /**
     * Constructs a new TestCase instance
     * Requirements addressed:
     * - TestCase Model Definition (system_design.database_design.test_data_storage)
     * 
     * @param suiteId - ID of the parent TestSuite
     * @param name - Name of the test case
     * @param flowType - Type of test flow (e.g., 'api', 'database', 'integration')
     * @param config - Configuration parameters for the test case
     * @param status - Initial status of the test case
     */
    constructor(
        suiteId: string,
        name: string,
        flowType: string,
        config: Record<string, any> = {},
        status: string = 'pending'
    ) {
        // Initialize base model fields
        this.id = crypto.randomUUID();
        this.createdAt = new Date();
        this.updatedAt = new Date();

        // Initialize TestCase specific fields
        this.suiteId = suiteId;
        this.name = this.validateName(name);
        this.flowType = this.validateFlowType(flowType);
        this.config = this.validateConfig(config);
        this.status = this.validateStatus(status);
    }

    /**
     * Validates and updates the status of the test case
     * Requirements addressed:
     * - Test case status management (system_design.database_design.test_data_storage)
     * 
     * @param newStatus - New status to be set
     * @throws Error if the status is invalid
     */
    public updateStatus(newStatus: string): void {
        this.status = this.validateStatus(newStatus);
        this.updatedAt = new Date();
    }

    /**
     * Validates the test case name
     * @param name - Name to validate
     * @returns Validated name
     * @throws Error if name is invalid
     */
    private validateName(name: string): string {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('Test case name must be a non-empty string');
        }
        if (name.length > 255) {
            throw new Error('Test case name must not exceed 255 characters');
        }
        return name.trim();
    }

    /**
     * Validates the flow type
     * @param flowType - Flow type to validate
     * @returns Validated flow type
     * @throws Error if flow type is invalid
     */
    private validateFlowType(flowType: string): string {
        const validFlowTypes = ['api', 'database', 'integration', 'e2e'];
        if (!validFlowTypes.includes(flowType)) {
            throw new Error(`Flow type must be one of: ${validFlowTypes.join(', ')}`);
        }
        return flowType;
    }

    /**
     * Validates the test case configuration
     * @param config - Configuration object to validate
     * @returns Validated configuration
     * @throws Error if configuration is invalid
     */
    private validateConfig(config: Record<string, any>): Record<string, any> {
        if (typeof config !== 'object' || config === null) {
            throw new Error('Configuration must be a valid object');
        }
        
        // Ensure the config object can be serialized
        try {
            JSON.stringify(config);
        } catch (error) {
            throw new Error('Configuration must be JSON serializable');
        }

        return config;
    }

    /**
     * Validates the test case status
     * @param status - Status to validate
     * @returns Validated status
     * @throws Error if status is invalid
     */
    private validateStatus(status: string): string {
        const validStatuses = ['pending', 'running', 'completed', 'failed', 'skipped'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        }
        return status;
    }

    /**
     * Converts the TestCase instance to a plain object for database operations
     * @returns Object representation of the TestCase
     */
    public toJSON(): Record<string, any> {
        return {
            id: this.id,
            suite_id: this.suiteId,
            name: this.name,
            flow_type: this.flowType,
            config: this.config,
            status: this.status,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }
}

/**
 * Initializes a new TestCase with validation and default values
 * Requirements addressed:
 * - TestCase initialization (system_design.database_design.test_data_storage)
 * 
 * @param data - Initial data for the test case
 * @returns A new TestCase instance
 */
export function initializeTestCase(data: {
    suiteId: string;
    name: string;
    flowType: string;
    config?: Record<string, any>;
    status?: string;
}): TestCase {
    return new TestCase(
        data.suiteId,
        data.name,
        data.flowType,
        data.config || {},
        data.status || 'pending'
    );
}