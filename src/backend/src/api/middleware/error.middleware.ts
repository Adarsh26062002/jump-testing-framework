// External dependencies
// express v4.17.1 - Web framework
import { Request, Response, NextFunction } from 'express';

// Internal dependencies
import { createError, isErrorType, ERROR_TYPES } from '../../utils/errors';
import { logMessage } from '../../utils/logger';

/**
 * Interface for HTTP error response structure
 * Implements error response format as per API integration layer specifications
 */
interface ErrorResponse {
    error: {
        type: string;
        message: string;
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Maps error types to HTTP status codes based on error handling matrix
 */
const ERROR_STATUS_CODES: { [key: string]: number } = {
    [ERROR_TYPES.VALIDATION_ERROR]: 400,      // Bad Request
    [ERROR_TYPES.AUTHENTICATION_ERROR]: 401,   // Unauthorized
    [ERROR_TYPES.DATABASE_ERROR]: 503,        // Service Unavailable
    [ERROR_TYPES.NETWORK_ERROR]: 504,         // Gateway Timeout
    [ERROR_TYPES.FLOW_ERROR]: 500,            // Internal Server Error
    [ERROR_TYPES.SCHEMA_ERROR]: 422           // Unprocessable Entity
};

/**
 * Express error handling middleware
 * Implements centralized error handling as per system architecture specifications
 * 
 * @param err - Error object thrown from previous middleware or route handlers
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express NextFunction
 */
const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Generate unique request ID for error tracking
    const requestId = req.headers['x-request-id'] as string || 
                     Math.random().toString(36).substring(7);

    try {
        // Log error with request context
        logMessage('error', JSON.stringify({
            error: err,
            requestId,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        }));

        let errorResponse: ErrorResponse;
        let statusCode: number = 500; // Default to internal server error

        // Handle known error types
        if (err.type && Object.values(ERROR_TYPES).includes(err.type)) {
            // Use existing error structure
            errorResponse = {
                error: {
                    type: err.type,
                    message: err.message,
                    timestamp: err.timestamp || new Date().toISOString(),
                    requestId
                }
            };
            statusCode = ERROR_STATUS_CODES[err.type] || 500;
        }
        // Handle validation errors (special case)
        else if (err.name === 'ValidationError' || err.name === 'JsonSchemaValidationError') {
            const validationError = createError('VALIDATION_ERROR', err.message);
            errorResponse = {
                error: {
                    type: validationError.type,
                    message: validationError.message,
                    timestamp: validationError.timestamp,
                    requestId
                }
            };
            statusCode = ERROR_STATUS_CODES[ERROR_TYPES.VALIDATION_ERROR];
        }
        // Handle unknown errors
        else {
            // Create standardized error for unknown error types
            const unknownError = createError(
                'FLOW_ERROR',
                'An unexpected error occurred'
            );
            errorResponse = {
                error: {
                    type: unknownError.type,
                    message: process.env.NODE_ENV === 'production' 
                        ? 'An unexpected error occurred'
                        : err.message || 'Unknown error',
                    timestamp: unknownError.timestamp,
                    requestId
                }
            };
        }

        // Set security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Content-Security-Policy', "default-src 'none'");

        // Send error response
        res.status(statusCode).json(errorResponse);
    } catch (handlingError) {
        // Log error handler failure
        logMessage('error', `Error handler failed: ${handlingError}`);

        // Send fallback error response
        res.status(500).json({
            error: {
                type: ERROR_TYPES.FLOW_ERROR,
                message: 'Error handling failed',
                timestamp: new Date().toISOString(),
                requestId
            }
        });
    }
};

// Export error handler as default export
export default errorHandler;