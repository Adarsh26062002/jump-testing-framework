// External dependencies
// None required

// Internal dependencies
import { parseGraphQLSchema, parseRESTSchema } from './SchemaParser';
import { generateAPITests } from './APITestGenerator';
import { generateDBTests } from './DBTestGenerator';
import { generateFlowTests, executeGeneratedTests } from './FlowTestGenerator';
import { logMessage } from '../../utils/logger';
import { createError } from '../../utils/errors';

/**
 * Initializes the test generation process by coordinating the API, DB, and flow test generators.
 * Implements the "Comprehensive Test Generation" requirement from system_architecture.component_responsibilities
 * 
 * @returns Promise<void> Resolves when all test generation processes are initialized
 */
export async function initializeTestGeneration(): Promise<void> {
    try {
        logMessage('info', 'Starting test generation initialization');

        // Step 1: Initialize schema parsers and parse schemas
        const schemas = await initializeSchemas();

        // Step 2: Generate API tests
        logMessage('info', 'Generating API tests');
        await generateAPITests({
            graphqlSchema: schemas.graphqlSchema,
            restSchema: schemas.restSchema,
            baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_TOKEN}`
            }
        });

        // Step 3: Generate DB tests
        logMessage('info', 'Generating database tests');
        const dbTests = await generateDBTests({
            graphQLSchema: schemas.graphqlSchema,
            restSchema: schemas.restSchema,
            databaseConfig: {
                tables: await getDatabaseSchema()
            }
        });

        // Step 4: Generate and execute flow tests
        logMessage('info', 'Generating and executing flow tests');
        const flowTests = await generateFlowTests([
            {
                id: 'api_db_integration_flow',
                name: 'API and Database Integration Flow',
                steps: [
                    {
                        id: 'create_data',
                        type: 'database',
                        config: {
                            query: 'INSERT INTO test_data (name, value) VALUES ($1, $2)',
                            data: ['test_name', 'test_value']
                        }
                    },
                    {
                        id: 'verify_api',
                        type: 'graphql',
                        config: {
                            query: `
                                query GetTestData($name: String!) {
                                    testData(name: $name) {
                                        id
                                        name
                                        value
                                    }
                                }
                            `,
                            variables: {
                                name: 'test_name'
                            }
                        }
                    }
                ]
            }
        ]);

        // Execute the generated flow tests
        await executeGeneratedTests(flowTests);

        logMessage('info', 'Test generation initialization completed successfully');

    } catch (error) {
        logMessage('error', `Test generation initialization failed: ${error.message}`);
        throw createError('TEST_GENERATION_ERROR', `Failed to initialize test generation: ${error.message}`);
    }
}

/**
 * Helper function to initialize and parse schemas
 * @returns Promise containing parsed GraphQL and REST schemas
 */
async function initializeSchemas(): Promise<{
    graphqlSchema: string;
    restSchema: string;
}> {
    try {
        // Parse GraphQL schema from the configured endpoint
        const graphqlSchema = await parseGraphQLSchema(
            process.env.GRAPHQL_SCHEMA_URL || 'http://localhost:3000/graphql'
        );

        // Parse REST schema from the OpenAPI/Swagger endpoint
        const restSchema = await parseRESTSchema(
            process.env.REST_SCHEMA_URL || 'http://localhost:3000/api-docs'
        );

        return {
            graphqlSchema: JSON.stringify(graphqlSchema),
            restSchema: JSON.stringify(restSchema)
        };

    } catch (error) {
        logMessage('error', `Schema initialization failed: ${error.message}`);
        throw error;
    }
}

/**
 * Helper function to retrieve database schema configuration
 * @returns Promise containing database table configurations
 */
async function getDatabaseSchema(): Promise<Array<{
    name: string;
    columns: Array<{
        name: string;
        type: string;
        constraints: string[];
    }>;
    relationships: Array<{
        type: 'oneToOne' | 'oneToMany' | 'manyToMany';
        targetTable: string;
        foreignKey: string;
    }>;
}>> {
    // This would typically be retrieved from database metadata or configuration
    return [
        {
            name: 'test_data',
            columns: [
                {
                    name: 'id',
                    type: 'integer',
                    constraints: ['primary key', 'not null']
                },
                {
                    name: 'name',
                    type: 'varchar',
                    constraints: ['not null']
                },
                {
                    name: 'value',
                    type: 'text',
                    constraints: []
                }
            ],
            relationships: []
        },
        {
            name: 'test_results',
            columns: [
                {
                    name: 'id',
                    type: 'integer',
                    constraints: ['primary key', 'not null']
                },
                {
                    name: 'test_id',
                    type: 'integer',
                    constraints: ['not null']
                },
                {
                    name: 'status',
                    type: 'varchar',
                    constraints: ['not null']
                },
                {
                    name: 'results',
                    type: 'jsonb',
                    constraints: []
                }
            ],
            relationships: [
                {
                    type: 'oneToMany',
                    targetTable: 'test_data',
                    foreignKey: 'test_id'
                }
            ]
        }
    ];
}

// Export the main initialization function
export { initializeTestGeneration };