/**
 * Migration script for creating the DataSet table
 * Requirements addressed:
 * - DataSet Table Creation (system_design.database_design.test_data_storage)
 * - Implements the DataSet entity schema with proper constraints and relationships
 */

// External dependencies
import { Client } from 'pg'; // v8.5.1

// Internal dependencies
import { executeQuery } from '../../services/database/client';
import { DataSet } from '../models/DataSet';

/**
 * Creates the DataSet table with all necessary columns, constraints, and indexes
 * @returns Promise<void>
 */
export const up = async (): Promise<void> => {
    try {
        // Create DataSet table with proper schema and constraints
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS data_sets (
                -- Primary key using UUID
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                -- Foreign key reference to test_data table
                data_id UUID NOT NULL REFERENCES test_data(id) ON DELETE CASCADE,

                -- JSONB column for flexible data storage
                values JSONB NOT NULL CHECK (jsonb_typeof(values) = 'object'),

                -- Status field with allowed values
                status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'archived', 'invalid', 'pending')),

                -- Timestamps for record tracking
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

                -- Additional constraints
                CONSTRAINT data_sets_values_not_empty CHECK (values != 'null'::jsonb AND values != '{}'::jsonb)
            );

            -- Create indexes for improved query performance
            CREATE INDEX IF NOT EXISTS idx_data_sets_data_id ON data_sets(data_id);
            CREATE INDEX IF NOT EXISTS idx_data_sets_status ON data_sets(status);
            CREATE INDEX IF NOT EXISTS idx_data_sets_created_at ON data_sets(created_at);

            -- Create a GIN index for efficient JSONB querying
            CREATE INDEX IF NOT EXISTS idx_data_sets_values ON data_sets USING GIN (values);

            -- Add trigger for automatic updated_at timestamp
            CREATE OR REPLACE FUNCTION update_data_sets_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trigger_update_data_sets_timestamp
                BEFORE UPDATE ON data_sets
                FOR EACH ROW
                EXECUTE FUNCTION update_data_sets_updated_at();

            -- Add comment to table for documentation
            COMMENT ON TABLE data_sets IS 'Stores individual data instances within test data collections';
        `;

        await executeQuery(createTableQuery);
        console.log('Successfully created data_sets table and related objects');

    } catch (error) {
        console.error('Error in migration up (create_data_set):', error);
        throw error;
    }
};

/**
 * Drops the DataSet table and related objects
 * @returns Promise<void>
 */
export const down = async (): Promise<void> => {
    try {
        // Drop all related objects in correct order
        const dropTableQuery = `
            -- Drop triggers first
            DROP TRIGGER IF EXISTS trigger_update_data_sets_timestamp ON data_sets;
            
            -- Drop functions
            DROP FUNCTION IF EXISTS update_data_sets_updated_at();
            
            -- Drop indexes
            DROP INDEX IF EXISTS idx_data_sets_data_id;
            DROP INDEX IF EXISTS idx_data_sets_status;
            DROP INDEX IF EXISTS idx_data_sets_created_at;
            DROP INDEX IF EXISTS idx_data_sets_values;
            
            -- Finally drop the table
            DROP TABLE IF EXISTS data_sets CASCADE;
        `;

        await executeQuery(dropTableQuery);
        console.log('Successfully dropped data_sets table and related objects');

    } catch (error) {
        console.error('Error in migration down (create_data_set):', error);
        throw error;
    }
};