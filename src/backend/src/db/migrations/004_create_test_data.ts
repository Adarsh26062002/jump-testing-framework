/**
 * Migration script for creating the TestData table
 * Requirements addressed:
 * - TestData Table Creation (system_design.database_design.test_data_storage)
 * - Implements the database schema for storing test data templates and their associated metadata
 */

// External dependencies
import { Knex } from 'knex'; // v8.5.1

/**
 * Creates the test_data table and its associated constraints
 * @param knex - The Knex instance for database operations
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('test_data', (table) => {
        // Primary key
        table.uuid('id').primary().notNullable()
            .comment('Unique identifier for the test data template');

        // Basic information
        table.string('name', 255).notNullable()
            .comment('Name of the test data template');
        
        // Scope can be: 'global', 'suite', or 'case'
        table.string('scope', 50).notNullable()
            .checkIn(['global', 'suite', 'case'])
            .comment('Scope of the test data (global, suite, or case level)');

        // Schema definition
        table.jsonb('schema').notNullable()
            .comment('JSON schema defining the structure of the test data');

        // Validity period
        table.timestamp('valid_from').notNullable()
            .comment('Start of the validity period for this test data');
        table.timestamp('valid_to').notNullable()
            .comment('End of the validity period for this test data');

        // Audit timestamps
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
            .comment('Timestamp when the record was created');
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
            .comment('Timestamp when the record was last updated');

        // Indexes
        table.index(['name'], 'idx_test_data_name')
            .comment('Index for faster lookups by test data name');
        table.index(['scope'], 'idx_test_data_scope')
            .comment('Index for filtering by scope');
        table.index(['valid_from', 'valid_to'], 'idx_test_data_validity_period')
            .comment('Index for validity period queries');

        // Constraints
        table.check(
            '?? < ??',
            ['valid_from', 'valid_to'],
            'check_valid_from_before_valid_to'
        ).comment('Ensures valid_from is before valid_to');
    });

    // Create a trigger to automatically update the updated_at timestamp
    await knex.raw(`
        CREATE OR REPLACE FUNCTION update_test_data_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER trigger_update_test_data_updated_at
            BEFORE UPDATE ON test_data
            FOR EACH ROW
            EXECUTE FUNCTION update_test_data_updated_at();
    `);

    // Add comments to the table
    await knex.raw(`
        COMMENT ON TABLE test_data IS 'Stores test data templates and their associated metadata';
    `);
}

/**
 * Drops the test_data table and its associated objects
 * @param knex - The Knex instance for database operations
 */
export async function down(knex: Knex): Promise<void> {
    // Drop the trigger and function first
    await knex.raw(`
        DROP TRIGGER IF EXISTS trigger_update_test_data_updated_at ON test_data;
        DROP FUNCTION IF EXISTS update_test_data_updated_at();
    `);

    // Drop the table
    await knex.schema.dropTableIfExists('test_data');
}