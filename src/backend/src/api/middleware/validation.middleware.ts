/**
 * Validation Middleware
 * This middleware handles the validation of incoming API requests against predefined schemas.
 * 
 * Requirements addressed:
 * - Request Validation Middleware (system_architecture.api_integration_layer)
 * - Implements middleware to validate incoming API requests against predefined schemas
 * - Ensures data integrity and prevents malformed data from reaching application logic
 */

// Internal dependencies
import { validateData } from '../../utils/validation';
import { createError } from '../../utils/errors';
import { logMessage } from '../../utils/logger';
import { DataSchema } from '../../types/data.types';
import { Request, Response, NextFunction } from 'express';

/**
 * Interface for requests that include a validation schema
 * Extends Express Request to include schema property
 */
interface ValidatedRequest extends Request {
    schema?: DataSchema;
}

/**
 * Middleware function to validate incoming API requests
 * Validates request body against the schema specified in the request object
 * 
 * @param req - Express request object with validation schema
 * @param res - Express response object
 * @param next - Express next function
 */
export const validateRequest = (
    req: ValidatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        // Log validation attempt
        logMessage('debug', `Starting request validation for path: ${req.path}`);

        // Extract schema from request
        const schema = req.schema;
        if (!schema) {
            const error = createError(
                'VALIDATION_ERROR',
                'No validation schema provided for request'
            );
            logMessage('error', `Validation failed: ${error.message}`);
            next(error);
            return;
        }

        // Extract data to validate from request body
        const data = req.body;

        // Log validation attempt details
        logMessage('debug', `Validating request data against schema: ${schema.name}`);

        try {
            // Validate request data against schema
            validateData(data, schema);

            // Log successful validation
            logMessage('info', `Request validation successful for schema: ${schema.name}`);

            // Proceed to next middleware if validation passes
            next();
        } catch (validationError: any) {
            // Log validation failure
            logMessage('error', `Request validation failed: ${validationError.message}`);

            // Create standardized validation error
            const error = createError(
                'VALIDATION_ERROR',
                `Request validation failed: ${validationError.message}`
            );

            // Pass error to error handling middleware
            next(error);
        }
    } catch (error: any) {
        // Handle unexpected errors
        logMessage('error', `Unexpected error in validation middleware: ${error.message}`);

        // Create standardized error for unexpected failures
        const unexpectedError = createError(
            'VALIDATION_ERROR',
            `Unexpected error during request validation: ${error.message}`
        );

        // Pass error to error handling middleware
        next(unexpectedError);
    }
};