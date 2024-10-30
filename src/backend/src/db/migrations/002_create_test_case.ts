// External dependencies
import { pg } from 'pg'; // v8.5.1

// Internal dependencies
import { executeQuery } from '../../services/database/client';
import { TestCase } from '../models/TestCase';
import { TestSuite } from '../models/TestSuite';
import { TestStep } from '../models/TestStep';

/**
 * Creates the TestCase table in the database
 * Requirements addressed:
 * - TestCase Table Creation (system_design.database_design.test_data_storage)
 * - Establishes relationships with TestSuite and TestStep tables
 * 
 * @returns Promise<void> Resolves when the table is created successfully
 */
export const createTestCaseTable = async (): Promise<void> => {
    // SQL query to create the TestCase table with all required fields and constraints
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS test_cases (
            -- Primary key using UUID
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

            -- Foreign key reference to test_suites table
            suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,

            -- Test case metadata
            name VARCHAR(255) NOT NULL CHECK (length(trim(name)) > 0),
            flow_type VARCHAR(50) NOT NULL CHECK (
                flow_type IN ('api', 'database', 'integration', 'e2e')
            ),

            -- Configuration stored as JSONB for flexible schema
            config JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (
                jsonb_typeof(config) = 'object'
            ),

            -- Status field with predefined valid values
            status VARCHAR(50) NOT NULL CHECK (
                status IN ('pending', 'running', 'completed', 'failed', 'skipped')
            ) DEFAULT 'pending',

            -- Timestamps for record tracking
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

            -- Ensure unique test case names within a suite
            CONSTRAINT unique_test_case_name_per_suite UNIQUE (suite_id, name)
        );

        -- Create indexes for improved query performance
        CREATE INDEX IF NOT EXISTS idx_test_cases_suite_id ON test_cases(suite_id);
        CREATE INDEX IF NOT EXISTS idx_test_cases_status ON test_cases(status);
        CREATE INDEX IF NOT EXISTS idx_test_cases_flow_type ON test_cases(flow_type);

        -- Create a trigger to automatically update the updated_at timestamp
        CREATE OR REPLACE FUNCTION update_test_case_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_test_case_timestamp ON test_cases;
        
        CREATE TRIGGER trigger_update_test_case_timestamp
            BEFORE UPDATE ON test_cases
            FOR EACH ROW
            EXECUTE FUNCTION update_test_case_timestamp();

        -- Add comments for documentation
        COMMENT ON TABLE test_cases IS 'Stores test cases that belong to test suites';
        COMMENT ON COLUMN test_cases.id IS 'Unique identifier for the test case';
        COMMENT ON COLUMN test_cases.suite_id IS 'Reference to the parent test suite';
        COMMENT ON COLUMN test_cases.name IS 'Name of the test case';
        COMMENT ON COLUMN test_cases.flow_type IS 'Type of test flow (api, database, integration, e2e)';
        COMMENT ON COLUMN test_cases.config IS 'JSON configuration for test case execution';
        COMMENT ON COLUMN test_cases.status IS 'Current status of the test case';
        COMMENT ON COLUMN test_cases.created_at IS 'Timestamp when the test case was created';
        COMMENT ON COLUMN test_cases.updated_at IS 'Timestamp when the test case was last updated';
    `;

    try {
        // Execute the table creation query
        await executeQuery(createTableQuery);
        console.log('Successfully created test_cases table');
    } catch (error) {
        console.error('Failed to create test_cases table:', error);
        throw error;
    }
};