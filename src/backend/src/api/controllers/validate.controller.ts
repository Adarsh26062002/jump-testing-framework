/**
 * Test Results Validation Controller
 * Version: 1.0.0
 * 
 * This controller handles the validation of test results against predefined schemas
 * and formats before being processed further.
 * 
 * Requirements addressed:
 * - Test Results Validation (system_design.api_design.api_endpoints)
 * - Implements validation endpoint for ensuring data integrity and correctness
 */

// External dependencies
// axios v0.21.1 - HTTP client library
import { Request, Response, NextFunction } from 'express';

// Internal dependencies
import { validateData } from '../../utils/validation';
import { validateRequest } from '../middleware/validation.middleware';
import { RESTClientConfig } from '../../types/api.types';
import { makeRequest } from '../../services/rest/client';

/**
 * Interface for test result validation request
 * Extends Express Request to include test result data
 */
interface TestResultValidationRequest extends Request {
    body: {
        testId: string;
        results: {
            testCases: Array<{
                id: string;
                status: 'passed' | 'failed' | 'skipped';
                duration: number;
                error?: string;
                steps: Array<{
                    id: string;
                    name: string;
                    status: 'passed' | 'failed' | 'skipped';
                    duration: number;
                    error?: string;
                }>;
            }>;
            summary: {
                totalTests: number;
                passed: number;
                failed: number;
                skipped: number;
                totalDuration: number;
            };
        };
        metadata: {
            environment: string;
            timestamp: string;
            version: string;
        };
    };
}

/**
 * Validates test results against predefined schemas and formats
 * Implements the /api/v1/validate endpoint for test results validation
 * 
 * @param req - Express request object containing test results
 * @param res - Express response object
 * @param next - Express next function
 */
export const validateTestResults = async (
    req: TestResultValidationRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extract test result data from request
        const { testId, results, metadata } = req.body;

        // Define validation schema for test results
        const testResultSchema = {
            name: 'testResults',
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

        // Validate test results against schema
        const isValid = validateData(req.body, testResultSchema);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid test results format',
                error: 'Validation failed'
            });
        }

        // Make external API call for additional validation if needed
        const externalValidationResponse = await makeRequest(
            'POST',
            `${RESTClientConfig.baseUrl}/validate/test-results`,
            {
                testId,
                results,
                metadata
            }
        );

        // Check external validation response
        if (externalValidationResponse.status !== 200) {
            return res.status(422).json({
                success: false,
                message: 'External validation failed',
                error: externalValidationResponse.data
            });
        }

        // Send success response if all validations pass
        res.status(200).json({
            success: true,
            message: 'Test results validation successful',
            data: {
                testId,
                validationTimestamp: new Date().toISOString(),
                validationStatus: 'passed'
            }
        });

    } catch (error) {
        // Pass error to error handling middleware
        next(error);
    }
};