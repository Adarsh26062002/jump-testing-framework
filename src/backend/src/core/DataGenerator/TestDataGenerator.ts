/**
 * Test Data Generator Implementation
 * Responsible for generating and seeding test data used in the testing framework.
 * 
 * Requirements addressed:
 * - Test Data Generation (system_architecture.data_generation_flow)
 * - Data Schema Validation (system_design.database_design.test_data_storage)
 */

// External dependencies
import { Pool } from 'pg'; // v8.5.1

// Internal dependencies
import { validateSchema } from './SchemaValidator';
import { TestData } from '../../db/models/TestData';
import { DataSet } from '../../db/models/DataSet';
import { createTestData } from '../../db/repositories/TestDataRepository';
import { createDataSet } from '../../db/repositories/DataSetRepository';
import { executeQuery } from '../../services/database/client';

/**
 * Generates test data based on provided schemas and seeds it into the database.
 * Implements the data generation flow as specified in the system architecture.
 * 
 * @param schemas - Array of data schemas to generate test data from
 * @returns Promise that resolves when test data generation and seeding is complete
 * @throws Error if schema validation or data generation fails
 */
export async function generateTestData(schemas: Array<any>): Promise<void> {
    try {
        // Validate all schemas before proceeding with data generation
        for (const schema of schemas) {
            if (!validateSchema(schema)) {
                throw new Error(`Invalid schema: ${schema.name}`);
            }
        }

        // Process each schema and generate test data
        for (const schema of schemas) {
            console.log(`Generating test data for schema: ${schema.name}`);

            // Create TestData entry
            const testData = new TestData(
                schema.name,
                schema.scope || 'global',
                schema.schema,
                new Date(), // validFrom
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // validTo (1 year)
            );

            // Save TestData to database
            const savedTestData = await createTestData(testData);

            // Generate sample data based on schema
            const generatedData = generateSampleData(schema.schema);

            // Create DataSet with generated values
            const dataSet = new DataSet(
                savedTestData.id,
                generatedData,
                'active'
            );

            // Seed the generated data into the database
            await seedDatabase(savedTestData, dataSet);

            console.log(`Successfully generated and seeded test data for schema: ${schema.name}`);
        }
    } catch (error) {
        console.error('Error in test data generation:', error);
        throw error;
    }
}

/**
 * Seeds the generated test data into the database using transactions.
 * Ensures data consistency by using atomic operations.
 * 
 * @param testData - TestData instance to be seeded
 * @param dataSet - DataSet instance containing the generated values
 * @returns Promise that resolves when data is successfully seeded
 * @throws Error if seeding operation fails
 */
async function seedDatabase(testData: TestData, dataSet: DataSet): Promise<void> {
    // Begin transaction
    const beginTxQuery = 'BEGIN';
    const commitTxQuery = 'COMMIT';
    const rollbackTxQuery = 'ROLLBACK';

    try {
        // Start transaction
        await executeQuery(beginTxQuery);

        try {
            // Create DataSet entry
            await createDataSet(dataSet);

            // Commit transaction if all operations succeed
            await executeQuery(commitTxQuery);
            console.log(`Successfully seeded data for TestData: ${testData.id}`);
        } catch (error) {
            // Rollback transaction if any operation fails
            await executeQuery(rollbackTxQuery);
            throw error;
        }
    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    }
}

/**
 * Generates sample data based on the provided JSON schema.
 * Supports various data types and formats defined in the schema.
 * 
 * @param schema - JSON schema defining the structure of data to generate
 * @returns Generated sample data conforming to the schema
 */
function generateSampleData(schema: any): Record<string, any> {
    const result: Record<string, any> = {};

    // Process each property defined in the schema
    for (const [key, prop] of Object.entries<any>(schema.properties)) {
        switch (prop.type) {
            case 'string':
                result[key] = generateString(prop);
                break;
            case 'number':
            case 'integer':
                result[key] = generateNumber(prop);
                break;
            case 'boolean':
                result[key] = Math.random() > 0.5;
                break;
            case 'array':
                result[key] = generateArray(prop);
                break;
            case 'object':
                result[key] = generateSampleData(prop);
                break;
            default:
                result[key] = null;
        }
    }

    return result;
}

/**
 * Generates a random string based on schema constraints
 * @param prop - Schema property definition for string
 * @returns Generated string value
 */
function generateString(prop: any): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const minLength = prop.minLength || 5;
    const maxLength = prop.maxLength || 10;
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

    if (prop.enum) {
        return prop.enum[Math.floor(Math.random() * prop.enum.length)];
    }

    if (prop.format === 'email') {
        return `test${Math.random().toString(36).substring(2)}@example.com`;
    }

    if (prop.format === 'date-time') {
        return new Date().toISOString();
    }

    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
}

/**
 * Generates a random number based on schema constraints
 * @param prop - Schema property definition for number
 * @returns Generated number value
 */
function generateNumber(prop: any): number {
    const min = prop.minimum || 0;
    const max = prop.maximum || 1000;
    const value = Math.random() * (max - min) + min;
    return prop.type === 'integer' ? Math.floor(value) : value;
}

/**
 * Generates an array of random values based on schema constraints
 * @param prop - Schema property definition for array
 * @returns Generated array of values
 */
function generateArray(prop: any): any[] {
    const minItems = prop.minItems || 1;
    const maxItems = prop.maxItems || 5;
    const length = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
    const result = [];

    for (let i = 0; i < length; i++) {
        if (prop.items.type === 'string') {
            result.push(generateString(prop.items));
        } else if (prop.items.type === 'number' || prop.items.type === 'integer') {
            result.push(generateNumber(prop.items));
        } else if (prop.items.type === 'boolean') {
            result.push(Math.random() > 0.5);
        } else if (prop.items.type === 'object') {
            result.push(generateSampleData(prop.items));
        }
    }

    return result;
}