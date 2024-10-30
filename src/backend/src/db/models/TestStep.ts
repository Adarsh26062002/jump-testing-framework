// External dependencies
import { Client } from 'pg'; // v8.5.1

// Internal dependencies
import { TestCase } from './TestCase';
import { TestData } from './TestData';
import { TestStepModel } from '../../types/db.types';

/**
 * TestStep class representing a single step within a test case
 * Implements the TestStep schema defined in system_design.database_design.test_data_storage
 */
export class TestStep implements TestStepModel {
    // Base model fields from DatabaseModel
    public id: string;
    public createdAt: Date;
    public updatedAt: Date;

    // TestStep specific fields as per database schema
    public caseId: string;
    public operation: string;
    public request: Record<string, any>;
    public expected: Record<string, any>;
    public sequence: number;

    /**
     * Constructs a new TestStep instance
     * Requirements addressed:
     * - TestStep Model Definition (system_design.database_design.test_data_storage)
     * 
     * @param caseId - ID of the parent TestCase
     * @param operation - Type of operation to be performed
     * @param request - Request parameters or payload
     * @param expected - Expected results or assertions
     * @param sequence - Order of execution within the test case
     */
    constructor(
        caseId: string,
        operation: string,
        request: Record<string, any>,
        expected: Record<string, any>,
        sequence: number
    ) {
        // Validate inputs before assignment
        if (!this.validateStepOperation(operation, request)) {
            throw new Error('Invalid operation or request parameters');
        }

        // Initialize base model fields
        this.id = crypto.randomUUID();
        this.createdAt = new Date();
        this.updatedAt = new Date();

        // Initialize TestStep specific fields
        this.caseId = caseId;
        this.operation = operation;
        this.request = request;
        this.expected = expected;
        this.sequence = this.validateSequence(sequence);
    }

    /**
     * Validates the operation type and parameters for a test step
     * Requirements addressed:
     * - Test step operation validation (system_design.database_design.test_data_storage)
     * 
     * @param operation - Operation type to validate
     * @param request - Request parameters to validate
     * @returns boolean indicating whether validation passes
     * @throws Error if validation fails
     */
    private validateStepOperation(operation: string, request: Record<string, any>): boolean {
        // Define valid operation types
        const validOperations = [
            'api_call',
            'database_query',
            'data_validation',
            'wait',
            'conditional',
            'transformation'
        ];

        // Check if operation is valid
        if (!validOperations.includes(operation)) {
            throw new Error(`Invalid operation type. Must be one of: ${validOperations.join(', ')}`);
        }

        // Validate request structure based on operation type
        switch (operation) {
            case 'api_call':
                if (!request.method || !request.endpoint) {
                    throw new Error('API call requires method and endpoint');
                }
                break;

            case 'database_query':
                if (!request.query || typeof request.query !== 'string') {
                    throw new Error('Database query requires a valid query string');
                }
                break;

            case 'data_validation':
                if (!request.rules || !Array.isArray(request.rules)) {
                    throw new Error('Data validation requires an array of validation rules');
                }
                break;

            case 'wait':
                if (!request.duration || typeof request.duration !== 'number') {
                    throw new Error('Wait operation requires a duration in milliseconds');
                }
                break;

            case 'conditional':
                if (!request.condition || !request.true_path || !request.false_path) {
                    throw new Error('Conditional operation requires condition and both paths');
                }
                break;

            case 'transformation':
                if (!request.input || !request.transformation) {
                    throw new Error('Transformation requires input and transformation definition');
                }
                break;
        }

        return true;
    }

    /**
     * Validates the sequence number
     * @param sequence - Sequence number to validate
     * @returns validated sequence number
     * @throws Error if sequence is invalid
     */
    private validateSequence(sequence: number): number {
        if (!Number.isInteger(sequence) || sequence < 0) {
            throw new Error('Sequence must be a non-negative integer');
        }
        return sequence;
    }

    /**
     * Updates the request parameters for the test step
     * @param newRequest - New request parameters
     */
    public updateRequest(newRequest: Record<string, any>): void {
        if (this.validateStepOperation(this.operation, newRequest)) {
            this.request = newRequest;
            this.updatedAt = new Date();
        }
    }

    /**
     * Updates the expected results for the test step
     * @param newExpected - New expected results
     */
    public updateExpected(newExpected: Record<string, any>): void {
        this.expected = newExpected;
        this.updatedAt = new Date();
    }

    /**
     * Updates the sequence number of the test step
     * @param newSequence - New sequence number
     */
    public updateSequence(newSequence: number): void {
        this.sequence = this.validateSequence(newSequence);
        this.updatedAt = new Date();
    }

    /**
     * Converts the TestStep instance to a plain object for database operations
     * Requirements addressed:
     * - Test step serialization (system_design.database_design.test_data_storage)
     * 
     * @returns Object representation of the TestStep
     */
    public toJSON(): Record<string, any> {
        return {
            id: this.id,
            case_id: this.caseId,
            operation: this.operation,
            request: this.request,
            expected: this.expected,
            sequence: this.sequence,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}

/**
 * Initializes a new TestStep with validation and default values
 * Requirements addressed:
 * - TestStep initialization (system_design.database_design.test_data_storage)
 * 
 * @param data - Initial data for the test step
 * @returns A new TestStep instance
 */
export function initializeTestStep(data: {
    caseId: string;
    operation: string;
    request: Record<string, any>;
    expected: Record<string, any>;
    sequence: number;
}): TestStep {
    return new TestStep(
        data.caseId,
        data.operation,
        data.request,
        data.expected,
        data.sequence
    );
}