/**
 * DatabaseSeeder Implementation
 * Responsible for seeding the database with initial test data.
 * 
 * Requirements addressed:
 * - Database Seeding (system_architecture.data_generation_flow)
 * - Test Data Storage (system_design.database_design.test_data_storage)
 */

// External dependencies
import { Pool } from 'pg'; // v8.5.1

// Internal dependencies
import { DataSet } from '../../db/models/DataSet';
import { TestData } from '../../db/models/TestData';
import { createDataSet } from '../../db/repositories/DataSetRepository';
import { createTestData } from '../../db/repositories/TestDataRepository';
import { executeQuery } from '../../services/database/client';
import { logMessage } from '../../utils/logger';

/**
 * Seeds the database with initial test data sets and test data.
 * Follows the data generation flow defined in the system architecture.
 * 
 * @returns Promise<void> Resolves when seeding is complete
 */
export async function seedDatabase(): Promise<void> {
    try {
        // Log start of seeding process
        logMessage('info', 'Starting database seeding process');

        // Initial test data definitions
        const testDataDefinitions = [
            {
                name: 'API Test Data',
                scope: 'global',
                schema: {
                    type: 'object',
                    properties: {
                        endpoint: { type: 'string' },
                        method: { type: 'string' },
                        headers: { type: 'object' },
                        payload: { type: 'object' }
                    },
                    required: ['endpoint', 'method']
                },
                validFrom: new Date(),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year validity
            },
            {
                name: 'Database Test Data',
                scope: 'suite',
                schema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        parameters: { type: 'array' },
                        expectedResult: { type: 'object' }
                    },
                    required: ['query']
                },
                validFrom: new Date(),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
        ];

        // Create test data entries
        logMessage('info', 'Creating test data definitions');
        const createdTestData: TestData[] = [];
        for (const definition of testDataDefinitions) {
            const testData = await createTestData(definition);
            createdTestData.push(testData);
            logMessage('debug', `Created test data: ${testData.name}`);
        }

        // Initial data sets for API testing
        const apiDataSets = [
            {
                dataId: createdTestData[0].id,
                values: {
                    endpoint: '/api/v1/users',
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ${token}'
                    },
                    payload: {}
                },
                status: 'active'
            },
            {
                dataId: createdTestData[0].id,
                values: {
                    endpoint: '/api/v1/users',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ${token}'
                    },
                    payload: {
                        username: 'testuser',
                        email: 'test@example.com'
                    }
                },
                status: 'active'
            }
        ];

        // Initial data sets for database testing
        const dbDataSets = [
            {
                dataId: createdTestData[1].id,
                values: {
                    query: 'SELECT * FROM users WHERE id = $1',
                    parameters: ['${userId}'],
                    expectedResult: {
                        rowCount: 1,
                        fields: ['id', 'username', 'email']
                    }
                },
                status: 'active'
            },
            {
                dataId: createdTestData[1].id,
                values: {
                    query: 'INSERT INTO users (username, email) VALUES ($1, $2)',
                    parameters: ['${username}', '${email}'],
                    expectedResult: {
                        rowCount: 1
                    }
                },
                status: 'active'
            }
        ];

        // Create API test data sets
        logMessage('info', 'Creating API test data sets');
        for (const dataSet of apiDataSets) {
            await createDataSet(dataSet);
            logMessage('debug', `Created API data set for ${dataSet.values.method} ${dataSet.values.endpoint}`);
        }

        // Create database test data sets
        logMessage('info', 'Creating database test data sets');
        for (const dataSet of dbDataSets) {
            await createDataSet(dataSet);
            logMessage('debug', `Created database data set for query: ${dataSet.values.query}`);
        }

        // Execute additional setup queries if needed
        logMessage('info', 'Executing additional setup queries');
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_test_data_scope 
            ON test_data(scope);
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_data_sets_status 
            ON data_sets(status);
        `);

        // Log successful completion
        logMessage('info', 'Database seeding completed successfully');
    } catch (error) {
        // Log error and rethrow
        logMessage('error', `Database seeding failed: ${error.message}`);
        throw error;
    }
}