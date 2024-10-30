// External dependencies
// express v4.17.1 - Web framework
import { Router } from 'express';

// Internal dependencies
import { getMetrics } from '../controllers/metrics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import errorHandler from '../middleware/error.middleware';
import { logRequest, logResponse } from '../middleware/logger.middleware';

/**
 * Schema for validating metrics query parameters
 * Implements validation requirements for metrics endpoint
 */
const metricsQuerySchema = {
    name: 'metrics_query',
    schema: {
        type: 'object',
        properties: {
            startDate: {
                type: 'string',
                format: 'date-time',
                description: 'Start date for metrics retrieval (ISO 8601)'
            },
            endDate: {
                type: 'string',
                format: 'date-time',
                description: 'End date for metrics retrieval (ISO 8601)'
            },
            environment: {
                type: 'string',
                enum: ['development', 'staging', 'production', 'all'],
                description: 'Environment filter for metrics'
            }
        },
        additionalProperties: false
    }
};

/**
 * Sets up metrics routes with required middleware
 * Implements metrics API endpoints as per system_design.api_design.api_endpoints
 * 
 * @param router - Express Router instance
 */
export const setupMetricsRoutes = (router: Router): void => {
    // Apply common middleware for all metrics routes
    router.use('/api/v1/metrics', [
        // Log incoming requests
        logRequest,
        // Log outgoing responses
        logResponse,
        // Authenticate requests
        authMiddleware
    ]);

    // GET /api/v1/metrics - Retrieve test metrics
    router.get('/api/v1/metrics',
        // Attach validation schema to request
        (req, res, next) => {
            req.schema = metricsQuerySchema;
            next();
        },
        // Validate request query parameters
        validateRequest,
        // Handle metrics retrieval
        getMetrics,
        // Handle errors
        errorHandler
    );
};