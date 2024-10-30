/**
 * DataSet Repository Implementation
 * Implements the repository pattern for managing DataSet entities in the database.
 * 
 * Requirements addressed:
 * - DataSet Repository Implementation (system_design.database_design.test_data_storage)
 * - Implements efficient data management and retrieval operations for DataSet entities
 */

// External dependencies
import { QueryResult } from 'pg'; // v8.5.1

// Internal dependencies
import { DataSet } from '../models/DataSet';
import { TestData } from '../models/TestData';
import { executeQuery } from '../../services/database/client';
import { DataSetModel } from '../../types/db.types';

/**
 * Creates a new DataSet entry in the database
 * @param dataSet - The DataSet model to create
 * @returns Promise resolving to the created DataSet instance
 */
export const createDataSet = async (dataSet: DataSetModel): Promise<DataSet> => {
    // Validate input data using DataSet model's validation
    const newDataSet = DataSet.initializeDataSet(dataSet);
    if (!newDataSet.validateValues()) {
        throw new Error('Invalid DataSet data provided');
    }

    const query = `
        INSERT INTO data_sets (
            id, data_id, values, status, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6
        ) RETURNING *;
    `;

    const params = [
        newDataSet.id,
        newDataSet.dataId,
        JSON.stringify(newDataSet.values),
        newDataSet.status,
        newDataSet.createdAt,
        newDataSet.updatedAt
    ];

    try {
        const result: QueryResult = await executeQuery(query, params);
        if (result.rows.length === 0) {
            throw new Error('Failed to create DataSet');
        }

        // Convert the raw database result to a DataSet instance
        const createdDataSet = result.rows[0];
        return new DataSet(
            createdDataSet.data_id,
            createdDataSet.values,
            createdDataSet.status
        );
    } catch (error) {
        console.error('Error creating DataSet:', error);
        throw error;
    }
};

/**
 * Retrieves a DataSet entry by its ID
 * @param id - The ID of the DataSet to retrieve
 * @returns Promise resolving to the DataSet instance if found, null otherwise
 */
export const getDataSetById = async (id: string): Promise<DataSet | null> => {
    const query = `
        SELECT * FROM data_sets
        WHERE id = $1 AND status != 'deleted';
    `;

    try {
        const result: QueryResult = await executeQuery(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }

        const dataSet = result.rows[0];
        return new DataSet(
            dataSet.data_id,
            dataSet.values,
            dataSet.status
        );
    } catch (error) {
        console.error('Error retrieving DataSet:', error);
        throw error;
    }
};

/**
 * Updates an existing DataSet entry in the database
 * @param id - The ID of the DataSet to update
 * @param updates - Partial DataSet model containing the fields to update
 * @returns Promise resolving to boolean indicating success
 */
export const updateDataSet = async (
    id: string,
    updates: Partial<DataSetModel>
): Promise<boolean> => {
    // Validate the update fields
    if (!updates || Object.keys(updates).length === 0) {
        throw new Error('No update fields provided');
    }

    // Build the update query dynamically based on provided fields
    const updateFields: string[] = [];
    const queryParams: any[] = [id];
    let paramCounter = 2;

    if (updates.values) {
        updateFields.push(`values = $${paramCounter}`);
        queryParams.push(JSON.stringify(updates.values));
        paramCounter++;
    }

    if (updates.status) {
        updateFields.push(`status = $${paramCounter}`);
        queryParams.push(updates.status);
        paramCounter++;
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = $${paramCounter}`);
    queryParams.push(new Date());

    const query = `
        UPDATE data_sets
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND status != 'deleted'
        RETURNING *;
    `;

    try {
        const result: QueryResult = await executeQuery(query, queryParams);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error updating DataSet:', error);
        throw error;
    }
};

/**
 * Deletes a DataSet entry from the database (soft delete)
 * @param id - The ID of the DataSet to delete
 * @returns Promise resolving to boolean indicating success
 */
export const deleteDataSet = async (id: string): Promise<boolean> => {
    // Implement soft delete by updating status to 'deleted'
    const query = `
        UPDATE data_sets
        SET status = 'deleted',
            updated_at = $2
        WHERE id = $1 AND status != 'deleted'
        RETURNING *;
    `;

    try {
        const result: QueryResult = await executeQuery(query, [id, new Date()]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting DataSet:', error);
        throw error;
    }
};

/**
 * Additional helper functions for DataSet repository operations
 */

/**
 * Retrieves all DataSets associated with a specific TestData ID
 * @param dataId - The ID of the parent TestData
 * @returns Promise resolving to an array of DataSet instances
 */
export const getDataSetsByDataId = async (dataId: string): Promise<DataSet[]> => {
    const query = `
        SELECT * FROM data_sets
        WHERE data_id = $1 AND status != 'deleted'
        ORDER BY created_at DESC;
    `;

    try {
        const result: QueryResult = await executeQuery(query, [dataId]);
        return result.rows.map(row => new DataSet(
            row.data_id,
            row.values,
            row.status
        ));
    } catch (error) {
        console.error('Error retrieving DataSets by dataId:', error);
        throw error;
    }
};

/**
 * Bulk creates multiple DataSet entries in a single transaction
 * @param dataSets - Array of DataSet models to create
 * @returns Promise resolving to an array of created DataSet instances
 */
export const bulkCreateDataSets = async (dataSets: DataSetModel[]): Promise<DataSet[]> => {
    const values: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    // Build the bulk insert query
    dataSets.forEach(dataSet => {
        const newDataSet = DataSet.initializeDataSet(dataSet);
        if (!newDataSet.validateValues()) {
            throw new Error(`Invalid DataSet data provided in bulk creation`);
        }

        values.push(`($${paramCounter}, $${paramCounter + 1}, $${paramCounter + 2}, $${paramCounter + 3}, $${paramCounter + 4}, $${paramCounter + 5})`);
        params.push(
            newDataSet.id,
            newDataSet.dataId,
            JSON.stringify(newDataSet.values),
            newDataSet.status,
            newDataSet.createdAt,
            newDataSet.updatedAt
        );
        paramCounter += 6;
    });

    const query = `
        INSERT INTO data_sets (
            id, data_id, values, status, created_at, updated_at
        ) VALUES ${values.join(', ')}
        RETURNING *;
    `;

    try {
        const result: QueryResult = await executeQuery(query, params);
        return result.rows.map(row => new DataSet(
            row.data_id,
            row.values,
            row.status
        ));
    } catch (error) {
        console.error('Error bulk creating DataSets:', error);
        throw error;
    }
};