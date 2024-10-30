/**
 * DataSet Model Implementation
 * Represents a collection of data set entries with associated metadata and operations.
 * 
 * Requirements addressed:
 * - DataSet Model Definition (system_design.database_design.test_data_storage)
 * - Implements the DataSet entity as per the database schema
 */

// External dependencies
import { Pool } from 'pg'; // v8.5.1

// Internal dependencies
import { DataSetModel, DatabaseModel } from '../../types/db.types';

/**
 * DataSet class implementing the DataSetModel interface
 * Manages individual data instances within a TestData collection
 */
export class DataSet implements DataSetModel {
    // DatabaseModel required fields
    public id: string;
    public createdAt: Date;
    public updatedAt: Date;

    // DataSetModel specific fields
    public dataId: string;
    public values: Record<string, any>;
    public status: string;

    /**
     * Constructs a new DataSet instance
     * @param dataId - Reference to the parent TestData entity
     * @param values - Key-value pairs of the dataset content
     * @param status - Current status of the dataset
     */
    constructor(dataId: string, values: Record<string, any>, status: string = 'active') {
        this.id = crypto.randomUUID(); // Generate UUID v4
        this.dataId = dataId;
        this.values = values;
        this.status = status;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Validates the values of the DataSet against predefined rules
     * @returns boolean indicating whether the values are valid
     */
    public validateValues(): boolean {
        try {
            // Ensure required fields are present
            if (!this.values || typeof this.values !== 'object') {
                return false;
            }

            // Ensure dataId is valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(this.dataId)) {
                return false;
            }

            // Validate status is one of the allowed values
            const validStatuses = ['active', 'archived', 'invalid', 'pending'];
            if (!validStatuses.includes(this.status)) {
                return false;
            }

            // Validate timestamps
            if (!(this.createdAt instanceof Date) || !(this.updatedAt instanceof Date)) {
                return false;
            }

            // All validations passed
            return true;
        } catch (error) {
            console.error('Error validating DataSet values:', error);
            return false;
        }
    }

    /**
     * Updates the status of the DataSet
     * @param newStatus - The new status to set
     */
    public updateStatus(newStatus: string): void {
        const validStatuses = ['active', 'archived', 'invalid', 'pending'];
        
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
        }

        this.status = newStatus;
        this.updatedAt = new Date();
    }

    /**
     * Initializes a new DataSet with default values and schema validation
     * @param data - Initial data for the DataSet
     * @returns A new instance of DataSet
     */
    public static initializeDataSet(data: Partial<DataSetModel>): DataSet {
        // Set default values for required fields
        const defaultData = {
            dataId: data.dataId || '',
            values: data.values || {},
            status: data.status || 'pending'
        };

        // Create and validate new instance
        const dataset = new DataSet(
            defaultData.dataId,
            defaultData.values,
            defaultData.status
        );

        if (!dataset.validateValues()) {
            throw new Error('Invalid DataSet data provided');
        }

        return dataset;
    }

    /**
     * Converts the DataSet instance to a plain object for database operations
     * @returns Object representation of the DataSet
     */
    public toJSON(): Record<string, any> {
        return {
            id: this.id,
            data_id: this.dataId,
            values: this.values,
            status: this.status,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }
}