/**
 * Application Entry Point
 * Version: 1.0.0
 * 
 * This file is responsible for setting up and initializing the backend application,
 * including configuring middleware, routes, and server settings.
 * 
 * Requirements addressed:
 * - Application Initialization (system_architecture.high-level_architecture_overview)
 * - API Integration Layer (system_architecture.api_integration_layer)
 * - Authentication and Authorization (security_considerations.authentication_and_authorization)
 */

// External dependencies
// express v4.17.1
import express, { Application } from 'express';
// dotenv v8.2.0
import dotenv from 'dotenv';

// Internal dependencies
import initializeRoutes from './api/routes/index';
import { authMiddleware } from './api/middleware/auth.middleware';
import errorHandler from './api/middleware/error.middleware';
import { logRequest, logResponse } from './api/middleware/logger.middleware';
import { validateRequest } from './api/middleware/validation.middleware';

/**
 * Initializes the Express application with all necessary middleware and configurations
 * Implements the core application setup as per system architecture specifications
 */
export const initializeApp = (): void => {
    try {
        // Load environment variables from .env file
        dotenv.config();

        // Create Express application instance
        const app: Application = express();

        // Basic Express configurations
        app.set('trust proxy', true);
        app.disable('x-powered-by');

        // Configure JSON parsing middleware
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Configure security headers
        app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });

        // Configure CORS
        app.use((req, res, next) => {
            res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });

        // Configure request logging middleware
        // Logs incoming requests with detailed information
        app.use(logRequest);

        // Configure authentication middleware
        // Implements JWT-based authentication
        app.use(authMiddleware);

        // Configure request validation middleware
        // Validates incoming requests against predefined schemas
        app.use(validateRequest);

        // Initialize and configure API routes
        // Sets up all application routes with their respective handlers
        app.use(initializeRoutes());

        // Configure response logging middleware
        // Logs outgoing responses with timing information
        app.use(logResponse);

        // Configure error handling middleware
        // Must be last in middleware chain
        app.use(errorHandler);

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
        });

        // Start the Express server
        const port = process.env.APP_PORT || 3000;
        app.listen(port, () => {
            console.log(`Server started on port ${port}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
};