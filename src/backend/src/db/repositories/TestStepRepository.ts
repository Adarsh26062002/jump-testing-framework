// External dependencies
import { QueryResult } from 'pg'; // v8.5.1

// Internal dependencies
import { TestStep } from '../models/TestStep';
import { TestCase } from '../models/TestCase';
import { TestData } from '../models/TestData';
import { executeQuery } from '../../services/database/client';

/**
 * Repository implementation for managing TestStep entities in the database
 * Requirements addressed:
 * - TestStep Repository Implementation (system_architecture.database_integration_layer)
 * - Test Data Storage (system_design.database_design.test_data_storage)
 */

/**
 * Creates a new test step in the database
 * @param testStep - The TestStep instance to create
 * @returns Promise resolving to the created TestStep
 */
export const createTestStep = async (testStep: TestStep): Promise<TestStep> => {
    // SQL query for inserting a new test step
    const query = `
        INSERT INTO test_steps (
            id,
            case_id,
            operation,
            request,
            expected,
            sequence,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;

    const values = [
        testStep.id,
        testStep.caseId,
        testStep.operation,
        JSON.stringify(testStep.request),
        JSON.stringify(testStep.expected),
        testStep.sequence,
        testStep.createdAt,
        testStep.updatedAt
    ];

    try {
        const result: QueryResult = await executeQuery(query, values);
        const createdStep = result.rows[0];
        
        // Convert the database record back to a TestStep instance
        return new TestStep(
            createdStep.case_id,
            createdStep.operation,
            JSON.parse(createdStep.request),
            JSON.parse(createdStep.expected),
            createdStep.sequence
        );
    } catch (error) {
        console.error('Error creating test step:', error);
        throw new Error(`Failed to create test step: ${error.message}`);
    }
};

/**
 * Retrieves a test step by its ID
 * @param id - The ID of the test step to retrieve
 * @returns Promise resolving to the TestStep if found, null otherwise
 */
export const getTestStepById = async (id: string): Promise<TestStep | null> => {
    const query = `
        SELECT *
        FROM test_steps
        WHERE id = $1;
    `;

    try {
        const result: QueryResult = await executeQuery(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const step = result.rows[0];
        return new TestStep(
            step.case_id,
            step.operation,
            JSON.parse(step.request),
            JSON.parse(step.expected),
            step.sequence
        );
    } catch (error) {
        console.error('Error retrieving test step:', error);
        throw new Error(`Failed to retrieve test step: ${error.message}`);
    }
};

/**
 * Updates an existing test step in the database
 * @param id - The ID of the test step to update
 * @param updates - Partial TestStep object containing the fields to update
 * @returns Promise resolving to boolean indicating success
 */
export const updateTestStep = async (
    id: string,
    updates: Partial<TestStep>
): Promise<boolean> => {
    // Build the SET clause dynamically based on provided updates
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (updates.operation) {
        updateFields.push(`operation = $${paramCounter}`);
        values.push(updates.operation);
        paramCounter++;
    }

    if (updates.request) {
        updateFields.push(`request = $${paramCounter}`);
        values.push(JSON.stringify(updates.request));
        paramCounter++;
    }

    if (updates.expected) {
        updateFields.push(`expected = $${paramCounter}`);
        values.push(JSON.stringify(updates.expected));
        paramCounter++;
    }

    if (typeof updates.sequence === 'number') {
        updateFields.push(`sequence = $${paramCounter}`);
        values.push(updates.sequence);
        paramCounter++;
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = $${paramCounter}`);
    values.push(new Date());
    
    // Add the ID as the last parameter
    values.push(id);

    const query = `
        UPDATE test_steps
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter + 1}
        RETURNING *;
    `;

    try {
        const result: QueryResult = await executeQuery(query, values);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error updating test step:', error);
        throw new Error(`Failed to update test step: ${error.message}`);
    }
};

/**
 * Deletes a test step from the database
 * @param id - The ID of the test step to delete
 * @returns Promise resolving to boolean indicating success
 */
export const deleteTestStep = async (id: string): Promise<boolean> => {
    const query = `
        DELETE FROM test_steps
        WHERE id = $1
        RETURNING id;
    `;

    try {
        const result: QueryResult = await executeQuery(query, [id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting test step:', error);
        throw new Error(`Failed to delete test step: ${error.message}`);
    }
};

/**
 * Helper function to get all test steps for a specific test case
 * @param caseId - The ID of the test case
 * @returns Promise resolving to an array of TestStep instances
 */
export const getTestStepsByTestCase = async (caseId: string): Promise<TestStep[]> => {
    const query = `
        SELECT *
        FROM test_steps
        WHERE case_id = $1
        ORDER BY sequence ASC;
    `;

    try {
        const result: QueryResult = await executeQuery(query, [caseId]);
        
        return result.rows.map(step => new TestStep(
            step.case_id,
            step.operation,
            JSON.parse(step.request),
            JSON.parse(step.expected),
            step.sequence
        ));
    } catch (error) {
        console.error('Error retrieving test steps for test case:', error);
        throw new Error(`Failed to retrieve test steps: ${error.message}`);
    }
};