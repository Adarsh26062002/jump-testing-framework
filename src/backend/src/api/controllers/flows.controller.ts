/**
 * Flow Controller
 * Handles the execution and management of test flows, integrating with various services
 * and middleware to ensure comprehensive test execution and validation.
 * 
 * Requirements addressed:
 * - Flow Execution and Management (system_architecture.test_flow_execution)
 * - API Integration Layer (system_architecture.api_integration_layer)
 */

// External dependencies
// express v4.17.1
import { Request, Response, NextFunction } from 'express';

// Internal dependencies
import { authMiddleware } from '../middleware/auth.middleware';
import errorHandler from '../middleware/error.middleware';
import { logRequest } from '../middleware/logger.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { executeGraphQLQuery } from '../../services/graphql/client';
import { makeRequest } from '../../services/rest/client';
import { executeQuery } from '../../services/database/client';
import { executeTestFlow } from '../../core/TestExecutor/FlowExecutor';
import { generateFlowTests } from '../../core/TestGenerator/FlowTestGenerator';
import { createError } from '../../utils/errors';

// Flow execution request schema for validation
const flowExecutionSchema = {
    name: 'flow_execution_request',
    schema: {
        type: 'object',
        required: ['flowConfig', 'environment'],
        properties: {
            flowConfig: {
                type: 'object',
                required: ['name', 'steps'],
                properties: {
                    name: { type: 'string', minLength: 1 },
                    description: { type: 'string' },
                    steps: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['type', 'config'],
                            properties: {
                                type: { 
                                    type: 'string',
                                    enum: ['graphql', 'rest', 'database']
                                },
                                config: { type: 'object' }
                            }
                        }
                    }
                }
            },
            environment: {
                type: 'string',
                enum: ['development', 'staging', 'production']
            },
            options: {
                type: 'object',
                properties: {
                    timeout: { type: 'number', minimum: 1000 },
                    retries: { type: 'number', minimum: 0 },
                    parallel: { type: 'boolean' }
                }
            }
        }
    }
};

/**
 * Executes a test flow based on the provided configuration
 * Implements flow execution as per system architecture specifications
 * 
 * @param req - Express request object containing flow configuration
 * @param res - Express response object
 * @param next - Express next function
 */
export const executeFlow = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Attach validation schema to request
        req.schema = flowExecutionSchema;

        // Apply middleware chain
        await Promise.all([
            new Promise((resolve) => authMiddleware(req, res, resolve)),
            new Promise((resolve) => validateRequest(req, res, resolve)),
            new Promise((resolve) => logRequest(req, res, resolve))
        ]);

        const { flowConfig, environment, options = {} } = req.body;

        // Generate test cases from flow configuration
        const generatedTests = await generateFlowTests({
            flowConfig,
            environment,
            options
        });

        // Execute the generated test flow
        const executionResults = await executeTestFlow({
            tests: generatedTests,
            environment,
            options: {
                timeout: options.timeout || 30000,
                retries: options.retries || 0,
                parallel: options.parallel || false
            }
        });

        // Process results for each step in the flow
        const processedResults = await Promise.all(
            executionResults.map(async (result) => {
                switch (result.type) {
                    case 'graphql':
                        return {
                            ...result,
                            response: await executeGraphQLQuery({
                                query: result.config.query,
                                variables: result.config.variables
                            })
                        };
                    case 'rest':
                        return {
                            ...result,
                            response: await makeRequest({
                                method: result.config.method,
                                url: result.config.url,
                                data: result.config.data,
                                headers: result.config.headers
                            })
                        };
                    case 'database':
                        return {
                            ...result,
                            response: await executeQuery({
                                query: result.config.query,
                                params: result.config.params
                            })
                        };
                    default:
                        throw createError(
                            'FLOW_ERROR',
                            `Unsupported step type: ${result.type}`
                        );
                }
            })
        );

        // Send successful response
        res.status(200).json({
            success: true,
            data: {
                flowName: flowConfig.name,
                environment,
                results: processedResults,
                summary: {
                    totalSteps: processedResults.length,
                    successfulSteps: processedResults.filter(r => r.status === 'success').length,
                    failedSteps: processedResults.filter(r => r.status === 'failure').length,
                    executionTime: processedResults.reduce((acc, r) => acc + r.executionTime, 0)
                }
            }
        });
    } catch (error) {
        // Handle any errors using the error handler middleware
        errorHandler(error, req, res, next);
    }
};