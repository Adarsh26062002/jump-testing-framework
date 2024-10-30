// External dependencies
import { QueryResult } from 'pg'; // v8.5.1

// Internal dependencies
import { TestCase } from '../models/TestCase';
import { TestStep } from '../models/TestStep';
import { TestData } from '../models/TestData';
import { TestSuite } from '../models/TestSuite';
import { executeQuery } from '../../services/database/client';

/**
 * Repository implementation for managing TestCase entities in the database
 * Requirements addressed:
 * - TestCase Repository Implementation (system_architecture.database_integration_layer)
 * - Test Data Storage (system_design.database_design.test_data_storage)
 */

/**
 * Creates a new test case in the database
 * @param testCase - The test case instance to create
 * @returns Promise resolving to the created TestCase
 */
export async function createTestCase(testCase: TestCase): Promise<TestCase> {
    // Validate the test case data using the model's validation
    const testCaseData = testCase.toJSON();
    
    const query = `
        INSERT INTO test_cases (
            id, suite_id, name, flow_type, config, status, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *;
    `;
    
    const params = [
        testCaseData.id,
        testCaseData.suite_id,
        testCaseData.name,
        testCaseData.flow_type,
        testCaseData.config,
        testCaseData.status,
        testCaseData.created_at,
        testCaseData.updated_at
    ];

    try {
        const result: QueryResult = await executeQuery(query, params);
        const createdTestCase = result.rows[0];
        
        // Convert the database record back to a TestCase instance
        return new TestCase(
            createdTestCase.suite_id,
            createdTestCase.name,
            createdTestCase.flow_type,
            createdTestCase.config,
            createdTestCase.status
        );
    } catch (error) {
        console.error('Error creating test case:', error);
        throw new Error(`Failed to create test case: ${error.message}`);
    }
}

/**
 * Retrieves a test case by its ID
 * @param id - The ID of the test case to retrieve
 * @returns Promise resolving to the TestCase if found, null otherwise
 */
export async function getTestCaseById(id: string): Promise<TestCase | null> {
    const query = `
        SELECT * FROM test_cases 
        WHERE id = $1;
    `;
    
    try {
        const result: QueryResult = await executeQuery(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const testCaseData = result.rows[0];
        return new TestCase(
            testCaseData.suite_id,
            testCaseData.name,
            testCaseData.flow_type,
            testCaseData.config,
            testCaseData.status
        );
    } catch (error) {
        console.error('Error retrieving test case:', error);
        throw new Error(`Failed to retrieve test case: ${error.message}`);
    }
}

/**
 * Updates an existing test case in the database
 * @param id - The ID of the test case to update
 * @param updates - Partial TestCase object containing the fields to update
 * @returns Promise resolving to true if update was successful
 */
export async function updateTestCase(id: string, updates: Partial<TestCase>): Promise<boolean> {
    // Build the update query dynamically based on provided fields
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramCounter = 1;
    
    // Map the updates to SQL parameters
    Object.entries(updates).forEach(([key, value]) => {
        // Convert camelCase to snake_case for database columns
        const columnName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updateFields.push(`${columnName} = $${paramCounter}`);
        queryParams.push(value);
        paramCounter++;
    });
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = $${paramCounter}`);
    queryParams.push(new Date());
    
    // Add the ID as the last parameter
    queryParams.push(id);
    
    const query = `
        UPDATE test_cases 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter + 1}
        RETURNING *;
    `;
    
    try {
        const result: QueryResult = await executeQuery(query, queryParams);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error updating test case:', error);
        throw new Error(`Failed to update test case: ${error.message}`);
    }
}

/**
 * Deletes a test case from the database
 * @param id - The ID of the test case to delete
 * @returns Promise resolving to true if deletion was successful
 */
export async function deleteTestCase(id: string): Promise<boolean> {
    // First delete related test steps due to foreign key constraints
    const deleteStepsQuery = `
        DELETE FROM test_steps 
        WHERE case_id = $1;
    `;
    
    // Then delete the test case
    const deleteTestCaseQuery = `
        DELETE FROM test_cases 
        WHERE id = $1 
        RETURNING id;
    `;
    
    try {
        // Delete related test steps first
        await executeQuery(deleteStepsQuery, [id]);
        
        // Delete the test case
        const result: QueryResult = await executeQuery(deleteTestCaseQuery, [id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting test case:', error);
        throw new Error(`Failed to delete test case: ${error.message}`);
    }
}