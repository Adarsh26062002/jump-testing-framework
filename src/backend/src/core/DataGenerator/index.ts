/**
 * Data Generator Module Entry Point
 * This file orchestrates the validation, generation, and seeding of test data within the system.
 * 
 * Requirements addressed:
 * - Data Generation and Seeding (system_architecture.data_generation_flow)
 * - Coordinates the processes of data validation, generation, and seeding
 */

// Internal dependencies
import { validateSchema } from './SchemaValidator';
import { generateTestData } from './TestDataGenerator';
import { seedDatabase } from './DatabaseSeeder';
import { logMessage } from '../../utils/logger';

/**
 * Initializes the data generation process by validating schemas,
 * generating test data, and seeding the database.
 * 
 * @param schemas - Array of data schemas to be processed
 * @returns Promise that resolves when the data generation and seeding process is complete
 * @throws Error if validation, generation, or seeding fails
 */
export async function initializeDataGeneration(schemas: Array<any>): Promise<void> {
    try {
        // Log start of data generation process
        logMessage('info', 'Starting data generation process');

        // Input validation
        if (!Array.isArray(schemas)) {
            throw new Error('Invalid input: schemas must be an array');
        }

        if (schemas.length === 0) {
            throw new Error('No schemas provided for data generation');
        }

        // Step 1: Schema Validation
        logMessage('info', 'Validating schemas');
        for (const schema of schemas) {
            try {
                const isValid = validateSchema(schema);
                if (!isValid) {
                    throw new Error(`Schema validation failed for: ${schema.name}`);
                }
                logMessage('debug', `Schema validated successfully: ${schema.name}`);
            } catch (error) {
                logMessage('error', `Schema validation error: ${error.message}`);
                throw error;
            }
        }

        // Step 2: Generate Test Data
        logMessage('info', 'Generating test data');
        try {
            await generateTestData(schemas);
            logMessage('debug', 'Test data generation completed');
        } catch (error) {
            logMessage('error', `Test data generation error: ${error.message}`);
            throw error;
        }

        // Step 3: Seed Database
        logMessage('info', 'Seeding database with generated data');
        try {
            await seedDatabase();
            logMessage('debug', 'Database seeding completed');
        } catch (error) {
            logMessage('error', `Database seeding error: ${error.message}`);
            throw error;
        }

        // Log successful completion
        logMessage('info', 'Data generation process completed successfully');
    } catch (error) {
        // Log error details and rethrow
        logMessage('error', `Data generation process failed: ${error.message}`);
        throw error;
    }
}