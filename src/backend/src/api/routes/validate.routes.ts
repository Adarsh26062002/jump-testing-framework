/**
 * Validation Routes Configuration
 * Version: 1.0.0
 * 
 * This file defines the API routes for validation operations, integrating middleware
 * for authentication, validation, error handling, and logging.
 * 
 * Requirements addressed:
 * - Validation API Routes (system_design.api_design.api_endpoints)
 * - Authentication and Authorization (security_considerations.authentication_and_authorization)
 */

// External dependencies
// express v4.17.1 - Web framework
import { Router } from 'express';

// Internal dependencies
import { validateTestResults } from '../controllers/validate.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import errorHandler from '../middleware/error.middleware';
import { logRequest, logResponse } from '../middleware/logger.middleware';

/**
 * Schema for validating test results request
 * Implements validation requirements for test results endpoint
 */
const testResultsValidationSchema = {
    name: 'testResultsValidation',
    schema: {
        type: 'object',
        required: ['testId', 'results', 'metadata'],
        properties: {
            testId: { type: 'string' },
            results: {
                type: 'object',
                required: ['testCases', 'summary'],
                properties: {
                    testCases: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['id', 'status', 'duration', 'steps'],
                            properties: {
                                id: { type: 'string' },
                                status: { 
                                    type: 'string',
                                    enum: ['passed', 'failed', 'skipped']
                                },
                                duration: { type: 'number' },
                                error: { type: 'string' },
                                steps: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        required: ['id', 'name', 'status', 'duration'],
                                        properties: {
                                            id: { type: 'string' },
                                            name: { type: 'string' },
                                            status: {
                                                type: 'string',
                                                enum: ['passed', 'failed', 'skipped']
                                            },
                                            duration: { type: 'number' },
                                            error: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    summary: {
                        type: 'object',
                        required: ['totalTests', 'passed', 'failed', 'skipped', 'totalDuration'],
                        properties: {
                            totalTests: { type: 'number' },
                            passed: { type: 'number' },
                            failed: { type: 'number' },
                            skipped: { type: 'number' },
                            totalDuration: { type: 'number' }
                        }
                    }
                }
            },
            metadata: {
                type: 'object',
                required: ['environment', 'timestamp', 'version'],
                properties: {
                    environment: { type: 'string' },
                    timestamp: { type: 'string' },
                    version: { type: 'string' }
                }
            }
        }
    }
};

/**
 * Sets up validation routes with necessary middleware and controller functions
 * Implements the validation endpoint as per API design specifications
 * 
 * @param router - Express Router instance
 * @returns void
 */
export const setupValidationRoutes = (router: Router): void => {
    // Create validation route group
    const validationRouter = Router();

    // Apply common middleware to all validation routes
    validationRouter.use(logRequest);
    validationRouter.use(logResponse);
    validationRouter.use(authMiddleware);

    // POST /api/v1/validate - Validate test results
    validationRouter.post(
        '/',
        (req, _, next) => {
            // Attach validation schema to request
            req.schema = testResultsValidationSchema;
            next();
        },
        validateRequest,
        validateTestResults
    );

    // Apply error handling middleware
    validationRouter.use(errorHandler);

    // Mount validation routes under /api/v1/validate
    router.use('/api/v1/validate', validationRouter);
};