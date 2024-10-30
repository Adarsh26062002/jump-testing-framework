// External dependencies
// axios v0.21.1
import axios from 'axios';

// Internal dependencies
import { parseGraphQLSchema, parseRESTSchema } from './SchemaParser';
import { StateManager } from '../TestManager/StateManager';
import { ResourceManager } from '../TestManager/ResourceManager';
import { validateGraphQLResponse, validateRESTResponse } from '../TestExecutor/ResponseValidator';
import { executeWithRetry } from '../TestExecutor/RetryHandler';
import { executeGraphQLQuery } from '../../services/graphql/client';
import { makeRequest } from '../../services/rest/client';
import { logMessage } from '../../utils/logger';
import { createError } from '../../utils/errors';

// Types
interface SchemaDetails {
    graphqlSchema?: string;
    restSchema?: string;
    baseUrl: string;
    headers?: Record<string, string>;
}

interface TestCase {
    id: string;
    type: 'graphql' | 'rest';
    endpoint: string;
    method?: string;
    query?: string;
    variables?: Record<string, any>;
    expectedStatus?: number;
    expectedResponse?: any;
    timeout?: number;
}

interface TestResult {
    testId: string;
    success: boolean;
    response?: any;
    error?: string;
    duration: number;
}

// Global configuration from JSON specification
const API_TEST_CONFIG = {
    maxRetries: 3,
    timeout: 5000
};

/**
 * Generates and executes API test cases based on parsed schemas
 * Implements API Test Generation requirement from system_architecture.component_responsibilities
 * 
 * @param schemaDetails - Details of the GraphQL and REST schemas to test
 * @returns Promise<void>
 */
export async function generateAPITests(schemaDetails: SchemaDetails): Promise<void> {
    try {
        logMessage('info', 'Starting API test generation');

        // Initialize managers
        const stateManager = new StateManager();
        const resourceManager = new ResourceManager();

        // Parse schemas
        const graphqlSchema = schemaDetails.graphqlSchema ? 
            await parseGraphQLSchema(schemaDetails.graphqlSchema) : null;
        const restSchema = schemaDetails.restSchema ? 
            await parseRESTSchema(schemaDetails.restSchema) : null;

        // Generate test cases
        const testCases: TestCase[] = [];

        // Generate GraphQL test cases
        if (graphqlSchema) {
            // Generate query tests
            for (const query of graphqlSchema.queries) {
                const testCase: TestCase = {
                    id: `graphql_query_${query.name}`,
                    type: 'graphql',
                    endpoint: schemaDetails.baseUrl,
                    query: generateGraphQLQuery(query),
                    variables: generateQueryVariables(query.parameters),
                    timeout: API_TEST_CONFIG.timeout
                };
                testCases.push(testCase);
            }

            // Generate mutation tests
            for (const mutation of graphqlSchema.mutations) {
                const testCase: TestCase = {
                    id: `graphql_mutation_${mutation.name}`,
                    type: 'graphql',
                    endpoint: schemaDetails.baseUrl,
                    query: generateGraphQLMutation(mutation),
                    variables: generateQueryVariables(mutation.parameters),
                    timeout: API_TEST_CONFIG.timeout
                };
                testCases.push(testCase);
            }
        }

        // Generate REST test cases
        if (restSchema) {
            for (const endpoint of restSchema.endpoints) {
                const testCase: TestCase = {
                    id: `rest_${endpoint.method.toLowerCase()}_${endpoint.path}`,
                    type: 'rest',
                    endpoint: `${schemaDetails.baseUrl}${endpoint.path}`,
                    method: endpoint.method,
                    expectedStatus: endpoint.responses[0]?.statusCode || 200,
                    expectedResponse: endpoint.responses[0]?.schema,
                    timeout: API_TEST_CONFIG.timeout
                };
                testCases.push(testCase);
            }
        }

        // Execute test cases
        for (const testCase of testCases) {
            try {
                // Initialize test state
                stateManager.initializeState({
                    id: testCase.id,
                    status: 'PENDING'
                });

                // Allocate resources
                const resourcesAllocated = await resourceManager.allocateResources({
                    id: testCase.id,
                    resourceRequirements: [{
                        type: testCase.type,
                        count: 1
                    }]
                });

                if (!resourcesAllocated) {
                    throw createError('RESOURCE_ERROR', 'Failed to allocate resources for test execution');
                }

                // Execute test with retry
                const result = await executeWithRetry(
                    async () => {
                        return await executeTestCase(testCase, schemaDetails.headers);
                    },
                    API_TEST_CONFIG.maxRetries,
                    testCase.timeout || API_TEST_CONFIG.timeout
                );

                // Update test state
                stateManager.updateState({
                    executionId: testCase.id,
                    status: result.success ? 'SUCCESS' : 'FAILED',
                    error: result.error
                });

                // Release resources
                resourceManager.releaseResources(testCase.id);

                // Log result
                logMessage(
                    result.success ? 'info' : 'error',
                    `Test ${testCase.id} ${result.success ? 'passed' : 'failed'}: ${result.error || ''}`
                );

            } catch (error) {
                logMessage('error', `Test execution failed for ${testCase.id}: ${error.message}`);
                
                // Update state and release resources in case of error
                stateManager.updateState({
                    executionId: testCase.id,
                    status: 'ERROR',
                    error: error.message
                });
                resourceManager.releaseResources(testCase.id);
            }
        }

        logMessage('info', 'API test generation and execution completed');

    } catch (error) {
        logMessage('error', `API test generation failed: ${error.message}`);
        throw error;
    }
}

/**
 * Executes a single test case
 * @param testCase - Test case to execute
 * @param headers - Optional headers to include in the request
 * @returns Promise<TestResult>
 */
async function executeTestCase(
    testCase: TestCase,
    headers?: Record<string, string>
): Promise<TestResult> {
    const startTime = Date.now();
    try {
        let response;

        if (testCase.type === 'graphql') {
            // Execute GraphQL query
            response = await executeGraphQLQuery(
                testCase.query!,
                testCase.variables,
                headers
            );

            // Validate GraphQL response
            const isValid = await validateGraphQLResponse(
                response,
                testCase.expectedResponse
            );

            return {
                testId: testCase.id,
                success: isValid,
                response,
                duration: Date.now() - startTime
            };

        } else {
            // Execute REST request
            response = await makeRequest(
                testCase.method!,
                testCase.endpoint,
                testCase.variables,
                headers
            );

            // Validate REST response
            const isValid = await validateRESTResponse(
                response,
                testCase.expectedStatus!,
                testCase.expectedResponse
            );

            return {
                testId: testCase.id,
                success: isValid,
                response,
                duration: Date.now() - startTime
            };
        }

    } catch (error) {
        return {
            testId: testCase.id,
            success: false,
            error: error.message,
            duration: Date.now() - startTime
        };
    }
}

/**
 * Generates a GraphQL query string
 * @param query - Query definition from schema
 * @returns string
 */
function generateGraphQLQuery(query: any): string {
    const parameters = query.parameters
        .map(param => `$${param.name}: ${param.type}${param.isRequired ? '!' : ''}`)
        .join(', ');

    const variables = query.parameters
        .map(param => `${param.name}: $${param.name}`)
        .join(', ');

    return `
        query ${query.name}(${parameters}) {
            ${query.name}(${variables}) {
                ... on ${query.returnType} {
                    id
                    # Add other fields based on return type
                }
            }
        }
    `;
}

/**
 * Generates a GraphQL mutation string
 * @param mutation - Mutation definition from schema
 * @returns string
 */
function generateGraphQLMutation(mutation: any): string {
    const parameters = mutation.parameters
        .map(param => `$${param.name}: ${param.type}${param.isRequired ? '!' : ''}`)
        .join(', ');

    const variables = mutation.parameters
        .map(param => `${param.name}: $${param.name}`)
        .join(', ');

    return `
        mutation ${mutation.name}(${parameters}) {
            ${mutation.name}(${variables}) {
                ... on ${mutation.returnType} {
                    id
                    # Add other fields based on return type
                }
            }
        }
    `;
}

/**
 * Generates variables for GraphQL queries/mutations
 * @param parameters - Parameter definitions from schema
 * @returns Record<string, any>
 */
function generateQueryVariables(parameters: any[]): Record<string, any> {
    const variables: Record<string, any> = {};

    for (const param of parameters) {
        // Generate appropriate test value based on type
        switch (param.type) {
            case 'String':
                variables[param.name] = `test_${param.name}`;
                break;
            case 'Int':
                variables[param.name] = 1;
                break;
            case 'Float':
                variables[param.name] = 1.0;
                break;
            case 'Boolean':
                variables[param.name] = true;
                break;
            case 'ID':
                variables[param.name] = `test_id_${Date.now()}`;
                break;
            default:
                if (param.isRequired) {
                    variables[param.name] = {};
                }
        }
    }

    return variables;
}