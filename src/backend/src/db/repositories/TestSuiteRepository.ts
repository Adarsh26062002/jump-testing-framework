// pg v8.5.1
import { TestSuite } from '../models/TestSuite';
import { executeQuery } from '../../services/database/client';
import {
    createTestCase,
    getTestCaseById,
    updateTestCase,
    deleteTestCase
} from './TestCaseRepository';
import {
    createTestData,
    getTestDataById,
    updateTestData,
    deleteTestData
} from './TestDataRepository';
import {
    createTestStep,
    getTestStepById,
    updateTestStep,
    deleteTestStep
} from './TestStepRepository';

/**
 * Creates a new test suite in the database
 * Requirements addressed:
 * - Test suite management (system_design.database_design.test_data_storage)
 * 
 * @param testSuite - The test suite instance to create
 * @returns Promise resolving to the created TestSuite
 */
export async function createTestSuite(testSuite: TestSuite): Promise<TestSuite> {
    const query = `
        INSERT INTO test_suites (
            id,
            name,
            description,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;

    const values = [
        testSuite.id,
        testSuite.name,
        testSuite.description,
        testSuite.createdAt,
        testSuite.updatedAt
    ];

    try {
        const result = await executeQuery(query, values);
        const createdSuite = result.rows[0];

        // Create associated test cases if any exist
        if (testSuite.testCases && testSuite.testCases.length > 0) {
            for (const testCase of testSuite.testCases) {
                await createTestCase({
                    ...testCase,
                    suiteId: createdSuite.id
                });
            }
        }

        return new TestSuite(createdSuite.name, createdSuite.description);
    } catch (error) {
        console.error('Error creating test suite:', error);
        throw new Error(`Failed to create test suite: ${error.message}`);
    }
}

/**
 * Retrieves a test suite by its ID
 * Requirements addressed:
 * - Test suite retrieval (system_design.database_design.test_data_storage)
 * 
 * @param id - The ID of the test suite to retrieve
 * @returns Promise resolving to the TestSuite if found, null otherwise
 */
export async function getTestSuiteById(id: string): Promise<TestSuite | null> {
    const query = `
        SELECT *
        FROM test_suites
        WHERE id = $1
    `;

    try {
        const result = await executeQuery(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const suiteData = result.rows[0];
        const testSuite = new TestSuite(suiteData.name, suiteData.description);
        
        // Retrieve associated test cases
        const testCasesQuery = `
            SELECT *
            FROM test_cases
            WHERE suite_id = $1
        `;
        
        const testCasesResult = await executeQuery(testCasesQuery, [id]);
        for (const testCase of testCasesResult.rows) {
            const fullTestCase = await getTestCaseById(testCase.id);
            if (fullTestCase) {
                testSuite.addTestCase(fullTestCase);
            }
        }

        return testSuite;
    } catch (error) {
        console.error('Error retrieving test suite:', error);
        throw new Error(`Failed to retrieve test suite: ${error.message}`);
    }
}

/**
 * Updates an existing test suite in the database
 * Requirements addressed:
 * - Test suite modification (system_design.database_design.test_data_storage)
 * 
 * @param id - The ID of the test suite to update
 * @param updates - Partial TestSuite object containing the fields to update
 * @returns Promise resolving to boolean indicating success
 */
export async function updateTestSuite(
    id: string,
    updates: Partial<TestSuite>
): Promise<boolean> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    // Build dynamic update query based on provided fields
    if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCounter}`);
        values.push(updates.name);
        paramCounter++;
    }
    if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCounter}`);
        values.push(updates.description);
        paramCounter++;
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = $${paramCounter}`);
    values.push(new Date());
    paramCounter++;

    // Add the ID as the last parameter
    values.push(id);

    const query = `
        UPDATE test_suites
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
    `;

    try {
        const result = await executeQuery(query, values);
        
        if (result.rowCount === 0) {
            return false;
        }

        // Update associated test cases if provided
        if (updates.testCases) {
            // Get existing test cases
            const existingTestCasesQuery = `
                SELECT id
                FROM test_cases
                WHERE suite_id = $1
            `;
            const existingTestCases = await executeQuery(existingTestCasesQuery, [id]);
            const existingIds = new Set(existingTestCases.rows.map(tc => tc.id));
            
            // Update or create new test cases
            for (const testCase of updates.testCases) {
                if (existingIds.has(testCase.id)) {
                    await updateTestCase(testCase.id, testCase);
                    existingIds.delete(testCase.id);
                } else {
                    await createTestCase({ ...testCase, suiteId: id });
                }
            }

            // Delete test cases that no longer exist in the updates
            for (const obsoleteId of existingIds) {
                await deleteTestCase(obsoleteId);
            }
        }

        return true;
    } catch (error) {
        console.error('Error updating test suite:', error);
        throw new Error(`Failed to update test suite: ${error.message}`);
    }
}

/**
 * Deletes a test suite from the database
 * Requirements addressed:
 * - Test suite deletion (system_design.database_design.test_data_storage)
 * 
 * @param id - The ID of the test suite to delete
 * @returns Promise resolving to boolean indicating success
 */
export async function deleteTestSuite(id: string): Promise<boolean> {
    try {
        // Begin by deleting all associated test cases
        const testCasesQuery = `
            SELECT id
            FROM test_cases
            WHERE suite_id = $1
        `;
        
        const testCasesResult = await executeQuery(testCasesQuery, [id]);
        
        // Delete all associated entities in the correct order
        for (const testCase of testCasesResult.rows) {
            // Delete associated test steps
            const testStepsQuery = `
                SELECT id
                FROM test_steps
                WHERE case_id = $1
            `;
            const testStepsResult = await executeQuery(testStepsQuery, [testCase.id]);
            for (const testStep of testStepsResult.rows) {
                await deleteTestStep(testStep.id);
            }

            // Delete associated test data
            const testDataQuery = `
                SELECT id
                FROM test_data
                WHERE case_id = $1
            `;
            const testDataResult = await executeQuery(testDataQuery, [testCase.id]);
            for (const testData of testDataResult.rows) {
                await deleteTestData(testData.id);
            }

            // Delete the test case itself
            await deleteTestCase(testCase.id);
        }

        // Finally, delete the test suite
        const deleteSuiteQuery = `
            DELETE FROM test_suites
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await executeQuery(deleteSuiteQuery, [id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting test suite:', error);
        throw new Error(`Failed to delete test suite: ${error.message}`);
    }
}