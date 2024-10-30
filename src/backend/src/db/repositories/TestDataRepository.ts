/**
 * TestData Repository Implementation
 * Implements the repository pattern for managing TestData entities in the database.
 * 
 * Requirements addressed:
 * - TestData Repository Implementation (system_design.database_design.test_data_storage)
 * - Implements efficient data management and retrieval operations for TestData entities
 */

// External dependencies
import { QueryResult } from 'pg'; // v8.5.1

// Internal dependencies
import { TestData } from '../models/TestData';
import { DataSet } from '../models/DataSet';
import { executeQuery } from '../../services/database/client';
import { TestDataModel } from '../../types/db.types';

/**
 * Creates a new TestData entry in the database
 * @param testData - The TestData model to be created
 * @returns Promise resolving to the created TestData instance
 */
export async function createTestData(testData: TestDataModel): Promise<TestData> {
    // Validate input data using TestData model's validation
    const newTestData = new TestData(
        testData.name,
        testData.scope,
        testData.schema,
        testData.validFrom,
        testData.validTo
    );

    if (!newTestData.validateSchema()) {
        throw new Error('Invalid TestData schema provided');
    }

    const query = `
        INSERT INTO test_data (
            id, name, scope, schema, valid_from, valid_to, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *;
    `;

    const values = [
        newTestData.id,
        newTestData.name,
        newTestData.scope,
        newTestData.schema,
        newTestData.validFrom,
        newTestData.validTo,
        newTestData.createdAt,
        newTestData.updatedAt
    ];

    try {
        const result: QueryResult = await executeQuery(query, values);
        if (result.rows.length === 0) {
            throw new Error('Failed to create TestData entry');
        }
        return new TestData(
            result.rows[0].name,
            result.rows[0].scope,
            result.rows[0].schema,
            new Date(result.rows[0].valid_from),
            new Date(result.rows[0].valid_to)
        );
    } catch (error) {
        console.error('Error creating TestData:', error);
        throw error;
    }
}

/**
 * Retrieves a TestData entry by its ID
 * @param id - The UUID of the TestData to retrieve
 * @returns Promise resolving to the TestData instance if found, null otherwise
 */
export async function getTestDataById(id: string): Promise<TestData | null> {
    const query = `
        SELECT id, name, scope, schema, valid_from, valid_to, created_at, updated_at
        FROM test_data
        WHERE id = $1;
    `;

    try {
        const result: QueryResult = await executeQuery(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return new TestData(
            row.name,
            row.scope,
            row.schema,
            new Date(row.valid_from),
            new Date(row.valid_to)
        );
    } catch (error) {
        console.error('Error retrieving TestData:', error);
        throw error;
    }
}

/**
 * Updates an existing TestData entry in the database
 * @param id - The UUID of the TestData to update
 * @param updates - Partial TestData model containing fields to update
 * @returns Promise resolving to boolean indicating success
 */
export async function updateTestData(
    id: string,
    updates: Partial<TestDataModel>
): Promise<boolean> {
    // Build update query dynamically based on provided fields
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    // Only include fields that are present in the updates object
    if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCounter}`);
        values.push(updates.name);
        paramCounter++;
    }
    if (updates.scope !== undefined) {
        updateFields.push(`scope = $${paramCounter}`);
        values.push(updates.scope);
        paramCounter++;
    }
    if (updates.schema !== undefined) {
        updateFields.push(`schema = $${paramCounter}`);
        values.push(updates.schema);
        paramCounter++;
    }
    if (updates.validFrom !== undefined) {
        updateFields.push(`valid_from = $${paramCounter}`);
        values.push(updates.validFrom);
        paramCounter++;
    }
    if (updates.validTo !== undefined) {
        updateFields.push(`valid_to = $${paramCounter}`);
        values.push(updates.validTo);
        paramCounter++;
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = $${paramCounter}`);
    values.push(new Date());
    paramCounter++;

    // Add ID as the last parameter
    values.push(id);

    const query = `
        UPDATE test_data
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *;
    `;

    try {
        const result: QueryResult = await executeQuery(query, values);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error updating TestData:', error);
        throw error;
    }
}

/**
 * Deletes a TestData entry from the database
 * @param id - The UUID of the TestData to delete
 * @returns Promise resolving to boolean indicating success
 */
export async function deleteTestData(id: string): Promise<boolean> {
    // First, delete associated DataSet records (due to foreign key constraints)
    const deleteDataSetsQuery = `
        DELETE FROM data_sets
        WHERE data_id = $1;
    `;

    // Then, delete the TestData record
    const deleteTestDataQuery = `
        DELETE FROM test_data
        WHERE id = $1
        RETURNING id;
    `;

    try {
        // Start with deleting associated DataSets
        await executeQuery(deleteDataSetsQuery, [id]);

        // Then delete the TestData
        const result: QueryResult = await executeQuery(deleteTestDataQuery, [id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting TestData:', error);
        throw error;
    }
}