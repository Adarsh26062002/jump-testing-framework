/**
 * Reports Routes Configuration
 * Implements API routing for report generation and retrieval endpoints
 * as specified in system_design.api_design.api_endpoints
 */

// External dependencies
// express v4.17.1
import { Router } from 'express';

// Internal dependencies
import { generateReport, getReport } from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { logRequest, logResponse } from '../middleware/logger.middleware';
import errorHandler from '../middleware/error.middleware';

// Report generation request schema for validation
const generateReportSchema = {
    name: 'generate_report_request',
    schema: {
        type: 'object',
        required: ['runId', 'executionData'],
        properties: {
            runId: { type: 'string', minLength: 1 },
            format: { type: 'string', enum: ['html', 'json', 'csv'] },
            includeMetrics: { type: 'boolean' },
            executionData: {
                type: 'object',
                required: ['startTime', 'endTime', 'summary', 'testCases'],
                properties: {
                    startTime: { type: 'string', format: 'date-time' },
                    endTime: { type: 'string', format: 'date-time' },
                    summary: {
                        type: 'object',
                        required: ['total', 'passed', 'failed', 'skipped', 'duration'],
                        properties: {
                            total: { type: 'number', minimum: 0 },
                            passed: { type: 'number', minimum: 0 },
                            failed: { type: 'number', minimum: 0 },
                            skipped: { type: 'number', minimum: 0 },
                            duration: { type: 'number', minimum: 0 }
                        }
                    },
                    testCases: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['id', 'name', 'status', 'duration', 'steps'],
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                status: { type: 'string', enum: ['passed', 'failed', 'skipped'] },
                                duration: { type: 'number', minimum: 0 },
                                error: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        stack: { type: 'string' }
                                    }
                                },
                                steps: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        required: ['name', 'status', 'duration'],
                                        properties: {
                                            name: { type: 'string' },
                                            status: { type: 'string', enum: ['passed', 'failed', 'skipped'] },
                                            duration: { type: 'number', minimum: 0 },
                                            error: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

/**
 * Sets up routes for report-related API endpoints
 * Implements the routing requirements from system_design.api_design.api_endpoints
 * 
 * @param router - Express Router instance
 * @returns Configured router with report routes
 */
export const setupReportRoutes = (router: Router): Router => {
    // POST /api/v1/reports - Generate a new report
    // Implements report generation endpoint with authentication, validation, and logging
    router.post(
        '/api/v1/reports',
        [
            // Authentication middleware to secure the endpoint
            authMiddleware,
            // Request validation middleware with report generation schema
            (req, _, next) => {
                req.schema = generateReportSchema;
                next();
            },
            validateRequest,
            // Request logging middleware
            logRequest,
            // Response logging middleware
            logResponse
        ],
        generateReport
    );

    // GET /api/v1/reports/:id - Retrieve a specific report
    // Implements report retrieval endpoint with authentication and logging
    router.get(
        '/api/v1/reports/:id',
        [
            // Authentication middleware to secure the endpoint
            authMiddleware,
            // Request logging middleware
            logRequest,
            // Response logging middleware
            logResponse
        ],
        getReport
    );

    // Attach error handler middleware
    router.use(errorHandler);

    return router;
};