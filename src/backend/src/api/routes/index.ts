/**
 * API Routes Index
 * Version: 1.0.0
 * 
 * This file serves as the central routing index for the API, aggregating and exporting
 * all route configurations for different API endpoints.
 * 
 * Requirements addressed:
 * - API Routing Integration (system_design.api_design.api_endpoints)
 * - API Integration Layer (system_architecture.api_integration_layer)
 */

// External dependencies
// express v4.17.1
import { Router } from 'express';

// Internal dependencies
// Route setup functions for different API endpoints
import setupDataRoutes from './data.routes';
import setupFlowRoutes from './flows.routes';
import { setupMetricsRoutes } from './metrics.routes';
import { setupReportRoutes } from './reports.routes';
import { setupValidationRoutes } from './validate.routes';

/**
 * Aggregates and initializes all API routes, applying necessary middleware
 * and linking to controller functions.
 * 
 * Implements the following API endpoints as per system_design.api_design.api_endpoints:
 * - POST /api/v1/flows - Execute test flow
 * - POST /api/v1/data - Generate test data
 * - POST /api/v1/validate - Validate test results
 * - GET /api/v1/reports - Retrieve test reports
 * - GET /api/v1/metrics - Get test metrics
 * 
 * @returns {Router} The configured router with all API routes
 */
const initializeRoutes = (): Router => {
    // Create a new Router instance for the main API router
    const router = Router();

    // Initialize data-related routes
    // Handles test data generation and retrieval endpoints
    const dataRouter = setupDataRoutes();
    router.use('/api/v1/data', dataRouter);

    // Initialize flow-related routes
    // Handles test flow execution endpoints
    setupFlowRoutes(router);

    // Initialize metrics-related routes
    // Handles test metrics retrieval endpoints
    setupMetricsRoutes(router);

    // Initialize report-related routes
    // Handles test report generation and retrieval endpoints
    setupReportRoutes(router);

    // Initialize validation-related routes
    // Handles test results validation endpoints
    setupValidationRoutes(router);

    return router;
};

// Export the route initialization function as default
export default initializeRoutes;