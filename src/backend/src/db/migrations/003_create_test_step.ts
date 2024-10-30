/**
 * Migration file for creating the TestStep table
 * Requirements addressed:
 * - TestStep Table Creation (system_design.database_design.test_data_storage)
 * - Defines schema for storing individual test steps associated with test cases
 */

// pg v8.5.1
import { QueryResult } from 'pg';
import { executeQuery } from '../../services/database/client';

/**
 * Creates the TestStep table in the database
 * Defines columns:
 * - id: UUID primary key
 * - case_id: UUID foreign key referencing TestCase
 * - operation: string representing the type of operation
 * - request: JSONB storing request details
 * - expected: JSONB storing expected response/outcome
 * - sequence: integer for step ordering
 * - created_at: timestamp for creation tracking
 * - updated_at: timestamp for modification tracking
 * 
 * @returns {Promise<void>} Resolves when table creation is complete
 */
export const createTestStepTable = async (): Promise<void> => {
    try {
        // SQL query to create the TestStep table with all required columns and constraints
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS test_step (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                case_id UUID NOT NULL REFERENCES test_case(id) ON DELETE CASCADE,
                operation VARCHAR(255) NOT NULL,
                request JSONB NOT NULL,
                expected JSONB NOT NULL,
                sequence INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                
                -- Ensure sequence numbers are unique within a test case
                UNIQUE(case_id, sequence),
                
                -- Ensure sequence numbers are positive
                CONSTRAINT positive_sequence CHECK (sequence > 0)
            );

            -- Index for faster lookups by case_id
            CREATE INDEX IF NOT EXISTS idx_test_step_case_id ON test_step(case_id);
            
            -- Index for ordering by sequence within a case
            CREATE INDEX IF NOT EXISTS idx_test_step_case_sequence ON test_step(case_id, sequence);

            -- Trigger to automatically update updated_at timestamp
            CREATE OR REPLACE FUNCTION update_test_step_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_test_step_updated_at ON test_step;
            
            CREATE TRIGGER trigger_update_test_step_updated_at
                BEFORE UPDATE ON test_step
                FOR EACH ROW
                EXECUTE FUNCTION update_test_step_updated_at();
        `;

        // Execute the table creation query
        await executeQuery(createTableQuery);
        
        console.log('Successfully created test_step table');
    } catch (error) {
        console.error('Failed to create test_step table:', error);
        throw error;
    }
};