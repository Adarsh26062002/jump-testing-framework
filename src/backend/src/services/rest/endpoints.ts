/**
 * REST API Endpoints Configuration
 * Version: 1.0.0
 * 
 * This file defines and sets up the REST API endpoints for the application,
 * integrating with route modules and middleware to handle requests and responses.
 * 
 * Requirements addressed:
 * - REST API Endpoints (system_design.api_design.api_endpoints)
 * - API Integration Layer (system_architecture.api_integration_layer)
 */

// External dependencies
// express v4.17.1
import { Router, Application } from 'express';

// Internal dependencies
import { setupDataRoutes } from '../../api/routes/data.routes';
import { setupFlowsRoutes } from '../../api/routes/flows.routes';
import { setupReportsRoutes } from '../../api/routes/reports.routes';
import { setupValidateRoutes } from '../../api/routes/validate.routes';
import { authenticateRequest } from '../../api/middleware/auth.middleware';
import { errorHandlerMiddleware } from '../../api/middleware/error.middleware';
import { loggerMiddleware } from '../../api/middleware/logger.middleware';

/**
 * Sets up metrics endpoint directly to avoid circular dependency
 * Implements the metrics endpoint as specified in system_design.api_design.api_endpoints
 * 
 * @param router - Express Router instance
 */
const setupMetricsEndpoint = (router: Router): void => {
    // GET /api/v1/metrics - Retrieve test metrics
    router.get('/api/v1/metrics',
        // Authentication middleware to secure the endpoint
        authenticateRequest,
        // Request logging middleware
        loggerMiddleware,
        async (req, res, next) => {
            try {
                // Basic metrics response structure
                const metrics = {
                    timestamp: new Date().toISOString(),
                    metrics: {
                        testExecution: {
                            totalTests: 0,
                            passRate: 0,
                            averageDuration: 0,
                            failureRate: 0
                        },
                        resourceUtilization: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            activeConnections: 0
                        },
                        performance: {
                            averageResponseTime: 0,
                            requestsPerSecond: 0,
                            errorRate: 0
                        }
                    }
                };

                // Return metrics response
                res.status(200).json(metrics);
            } catch (error) {
                next(error);
            }
        }
    );
};

/**
 * Sets up the REST API endpoints by integrating with route modules and middleware
 * Implements the routing structure as per API integration layer specifications
 * 
 * @param app - Express Application instance
 */
export const setupEndpoints = (app: Application): void => {
    // Create main router instance
    const router = Router();

    // Apply global middleware
    router.use(loggerMiddleware);
    router.use(authenticateRequest);

    // Mount data routes
    // Implements data-related endpoints for test data operations
    const dataRouter = Router();
    setupDataRoutes(dataRouter);
    router.use('/api/v1/data', dataRouter);

    // Mount flows routes
    // Implements flow execution endpoints for test flow management
    const flowsRouter = Router();
    setupFlowsRoutes(flowsRouter);
    router.use('/api/v1/flows', flowsRouter);

    // Mount reports routes
    // Implements report generation and retrieval endpoints
    const reportsRouter = Router();
    setupReportsRoutes(reportsRouter);
    router.use('/api/v1/reports', reportsRouter);

    // Mount validation routes
    // Implements test results validation endpoints
    const validateRouter = Router();
    setupValidateRoutes(validateRouter);
    router.use('/api/v1/validate', validateRouter);

    // Set up metrics endpoint
    // Implements metrics retrieval endpoint
    setupMetricsEndpoint(router);

    // Apply error handler middleware as the last middleware in the chain
    router.use(errorHandlerMiddleware);

    // Mount all routes under the main router
    app.use(router);
};