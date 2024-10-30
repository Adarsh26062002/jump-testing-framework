/**
 * Backend Application Entry Point
 * Version: 1.0.0
 * 
 * This file serves as the main entry point for the backend application,
 * responsible for initializing all core components and starting the server.
 * 
 * Requirements addressed:
 * - Application Initialization (system_architecture.high-level_architecture_overview)
 * - Component Configuration (system_architecture.component_configuration)
 */

// External dependencies
// dotenv v8.2.0
import * as dotenv from 'dotenv';

// Internal dependencies
import { initializeApp } from './app';
import { configureRESTClient } from './config/api.config';
import { loadDatabaseConfig } from './config/database.config';
import { configureLogger } from './config/logger.config';
import { connect } from './services/database/client';
import { logMessage } from './utils/logger';

// Global server port configuration
const SERVER_PORT = process.env.SERVER_PORT || 3000;

/**
 * Starts the server after initializing all required components
 * Implements the application startup sequence as per system architecture
 */
export const startServer = async (): Promise<void> => {
    try {
        // Step 1: Load environment variables
        // This must be done first as other configurations depend on env vars
        dotenv.config();
        logMessage('info', 'Environment variables loaded successfully');

        // Step 2: Configure logger
        // Set up logging before other operations to ensure proper error tracking
        configureLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: 'json',
            transports: {
                console: true,
                file: {
                    enabled: true,
                    filename: 'logs/app.log'
                }
            }
        });
        logMessage('info', 'Logger configured successfully');

        // Step 3: Configure REST client
        // Set up API client with proper timeout and retry settings
        configureRESTClient({
            baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
            timeout: parseInt(process.env.API_TIMEOUT || '5000', 10),
            headers: {
                'X-API-Version': '1.0',
                'X-Client-ID': process.env.API_CLIENT_ID || 'test-framework'
            }
        });
        logMessage('info', 'REST client configured successfully');

        // Step 4: Load database configuration
        // Prepare database connection parameters
        const dbConfig = loadDatabaseConfig();
        logMessage('info', 'Database configuration loaded successfully');

        // Step 5: Establish database connection
        // Connect to the database before starting the server
        await connect();
        logMessage('info', 'Database connection established successfully');

        // Step 6: Initialize Express application
        // Set up middleware, routes, and start the server
        await initializeApp();
        logMessage('info', `Server started successfully on port ${SERVER_PORT}`);

        // Set up graceful shutdown handlers
        process.on('SIGTERM', handleGracefulShutdown);
        process.on('SIGINT', handleGracefulShutdown);
        
    } catch (error) {
        logMessage('error', `Server startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }
};

/**
 * Handles graceful shutdown of the application
 * Ensures proper cleanup of resources and connections
 */
const handleGracefulShutdown = async (): Promise<void> => {
    try {
        logMessage('info', 'Graceful shutdown initiated');
        
        // Allow ongoing requests to complete (30 second timeout)
        const shutdownTimeout = setTimeout(() => {
            logMessage('error', 'Forced shutdown due to timeout');
            process.exit(1);
        }, 30000);

        // Cleanup operations
        await Promise.all([
            // Close database connections
            connect().then(() => {
                logMessage('info', 'Database connections closed');
            }),
            // Additional cleanup operations can be added here
        ]);

        clearTimeout(shutdownTimeout);
        logMessage('info', 'Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logMessage('error', `Error during graceful shutdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }
};

// Start the server if this file is run directly
if (require.main === module) {
    startServer().catch((error) => {
        logMessage('error', `Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    });
}