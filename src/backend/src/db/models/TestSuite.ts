// pg v8.5.1
import { Client } from 'pg';
import { DatabaseModel, TestCaseModel } from '../../types/db.types';

/**
 * TestSuite class representing a collection of test cases with associated metadata
 * Implements the TestSuite schema defined in system_design.database_design.test_data_storage
 */
export class TestSuite implements DatabaseModel {
    // Base model fields
    public id: string;
    public createdAt: Date;
    public updatedAt: Date;

    // TestSuite specific fields
    public name: string;
    public description: string;
    public testCases: TestCaseModel[];

    /**
     * Constructs a new TestSuite instance
     * @param name - The name of the test suite
     * @param description - Detailed description of the test suite's purpose
     */
    constructor(name: string, description: string) {
        // Initialize base model fields with default values
        this.id = crypto.randomUUID();
        this.createdAt = new Date();
        this.updatedAt = new Date();

        // Initialize TestSuite specific fields
        this.name = name;
        this.description = description;
        this.testCases = [];
    }

    /**
     * Adds a new test case to the suite
     * @param testCase - The test case to be added
     * Requirements addressed:
     * - Test suite management (system_design.database_design.test_data_storage)
     */
    public addTestCase(testCase: TestCaseModel): void {
        // Validate that the test case has required fields
        if (!testCase.name || !testCase.flowType) {
            throw new Error('Test case must have a name and flow type');
        }

        // Ensure the test case has a reference to this suite
        const testCaseWithSuite: TestCaseModel = {
            ...testCase,
            suiteId: this.id
        };

        // Add the test case to the collection
        this.testCases.push(testCaseWithSuite);

        // Update the last modified timestamp
        this.updatedAt = new Date();
    }

    /**
     * Removes a test case from the suite
     * @param testCaseId - The ID of the test case to remove
     * @returns boolean indicating whether the removal was successful
     * Requirements addressed:
     * - Test suite management (system_design.database_design.test_data_storage)
     */
    public removeTestCase(testCaseId: string): boolean {
        const initialLength = this.testCases.length;
        
        // Filter out the test case with the specified ID
        this.testCases = this.testCases.filter(tc => tc.id !== testCaseId);
        
        // Check if a test case was actually removed
        const wasRemoved = initialLength > this.testCases.length;
        
        if (wasRemoved) {
            // Update the last modified timestamp only if a test case was removed
            this.updatedAt = new Date();
        }
        
        return wasRemoved;
    }
}

/**
 * Initializes a new TestSuite with validation and default values
 * @param data - Initial data for the test suite
 * @returns A new TestSuite instance
 * Requirements addressed:
 * - Test suite initialization (system_design.database_design.test_data_storage)
 */
export function initializeTestSuite(data: {
    name: string;
    description?: string;
}): TestSuite {
    // Validate required fields
    if (!data.name) {
        throw new Error('Test suite name is required');
    }

    // Create new test suite with provided or default values
    return new TestSuite(
        data.name,
        data.description || 'No description provided'
    );
}