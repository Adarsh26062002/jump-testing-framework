/**
 * Flow Routes
 * Defines routing for flow-related API endpoints, integrating with controllers and middleware
 * for authentication, validation, and error handling.
 * 
 * Requirements addressed:
 * - API Endpoints for Flow Management (system_design.api_design.api_endpoints)
 * - Authentication and Authorization (security_considerations.authentication_and_authorization)
 */

// External dependencies
// express v4.17.1
import { Router } from 'express';

// Internal dependencies
import { executeFlow } from '../controllers/flows.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { logRequest } from '../middleware/logger.middleware';
import errorHandler from '../middleware/error.middleware';

/**
 * Sets up the routes for flow-related API endpoints
 * Implements routing as per API design specifications
 * 
 * @param router - Express Router instance
 * @returns Configured router with flow routes
 */
const setupFlowRoutes = (router: Router): Router => {
    // Create a new router instance for flow routes
    const flowRouter = Router();

    /**
     * POST /api/v1/flows
     * Execute test flow endpoint
     * Implements flow execution endpoint as per API design specifications
     * 
     * Authentication: Required (JWT)
     * Request Body: Flow configuration object
     * Response: Flow execution results
     */
    flowRouter.post(
        '/',
        // Apply authentication middleware
        authMiddleware,
        // Apply request validation middleware
        validateRequest,
        // Apply request logging middleware
        logRequest,
        // Execute flow controller function
        executeFlow,
        // Apply error handling middleware
        errorHandler
    );

    // Mount flow routes under /api/v1/flows
    router.use('/api/v1/flows', flowRouter);

    return router;
};

// Export the route setup function
export default setupFlowRoutes;