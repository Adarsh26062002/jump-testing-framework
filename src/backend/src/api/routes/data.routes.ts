/**
 * Data Routes Configuration
 * Defines API routes for data-related operations with middleware application and controller mapping.
 * 
 * Requirements addressed:
 * - Data API Endpoints (system_design.api_design.api_endpoints)
 * - Implements routes for data operations with proper middleware chain
 */

// External dependencies
// express v4.17.1
import { Router } from 'express';

// Internal dependencies
import { getData, createData } from '../controllers/data.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import errorHandler from '../middleware/error.middleware';
import { logRequest } from '../middleware/logger.middleware';
import { validateRequest } from '../middleware/validation.middleware';

/**
 * Configures and sets up data-related API routes with middleware chain
 * Implements route configuration as per API integration layer specifications
 * 
 * @returns Configured Express Router instance with data routes
 */
const setupRoutes = (): Router => {
    // Create new router instance
    const router = Router();

    // GET /api/v1/data
    // Retrieves data based on query parameters
    router.get(
        '/',
        // Authentication middleware to ensure request is authorized
        authMiddleware,
        // Request logging middleware for traceability
        logRequest,
        // Request validation middleware for query parameters
        validateRequest,
        // Controller function to handle data retrieval
        getData
    );

    // POST /api/v1/data
    // Creates new data entry
    router.post(
        '/',
        // Authentication middleware to ensure request is authorized
        authMiddleware,
        // Request logging middleware for traceability
        logRequest,
        // Request validation middleware for request body
        validateRequest,
        // Controller function to handle data creation
        createData
    );

    // Apply error handling middleware last in the chain
    router.use(errorHandler);

    return router;
};

// Export the route setup function as default export
export default setupRoutes;