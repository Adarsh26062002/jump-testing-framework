/**
 * Migration: Create TestSuite Table
 * 
 * Requirements addressed:
 * - TestSuite Table Migration (system_design.database_design.test_data_storage)
 * - Implements the base table for test suite management
 */

// pg v8.5.1
import { QueryResult } from 'pg';
import { executeQuery } from '../../services/database/client';

/**
 * Applies the migration to create the TestSuite table
 * Creates the initial schema for storing test suite information
 * 
 * @returns {Promise<void>} Resolves when migration is successfully applied
 */
export const up = async (): Promise<void> => {
    // SQL query to create the TestSuite table with all required fields
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS test_suite (
            -- Primary identifier using UUID for global uniqueness
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Basic test suite information
            name VARCHAR(255) NOT NULL,
            description TEXT,
            
            -- Audit timestamps for tracking
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            
            -- Constraints
            CONSTRAINT test_suite_name_unique UNIQUE (name)
        );

        -- Trigger to automatically update the updated_at timestamp
        CREATE OR REPLACE FUNCTION update_test_suite_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER update_test_suite_timestamp
            BEFORE UPDATE ON test_suite
            FOR EACH ROW
            EXECUTE FUNCTION update_test_suite_timestamp();

        -- Comments for documentation
        COMMENT ON TABLE test_suite IS 'Stores test suite definitions and metadata';
        COMMENT ON COLUMN test_suite.id IS 'Unique identifier for the test suite';
        COMMENT ON COLUMN test_suite.name IS 'Name of the test suite';
        COMMENT ON COLUMN test_suite.description IS 'Detailed description of the test suite purpose and scope';
        COMMENT ON COLUMN test_suite.created_at IS 'Timestamp when the test suite was created';
        COMMENT ON COLUMN test_suite.updated_at IS 'Timestamp when the test suite was last updated';
    `;

    try {
        await executeQuery(createTableQuery);
        console.log('Successfully created test_suite table');
    } catch (error) {
        console.error('Failed to create test_suite table:', error);
        throw error;
    }
};

/**
 * Reverts the migration by dropping the TestSuite table
 * Removes the table and associated objects (triggers, functions)
 * 
 * @returns {Promise<void>} Resolves when migration is successfully reverted
 */
export const down = async (): Promise<void> => {
    // SQL query to clean up all related objects
    const dropTableQuery = `
        -- Drop the trigger first
        DROP TRIGGER IF EXISTS update_test_suite_timestamp ON test_suite;
        
        -- Drop the trigger function
        DROP FUNCTION IF EXISTS update_test_suite_timestamp();
        
        -- Drop the main table
        DROP TABLE IF EXISTS test_suite;
    `;

    try {
        await executeQuery(dropTableQuery);
        console.log('Successfully dropped test_suite table and related objects');
    } catch (error) {
        console.error('Failed to drop test_suite table:', error);
        throw error;
    }
};