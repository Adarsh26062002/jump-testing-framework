// External dependencies
// debug v4.3.4 - For internal error logging
import debug from 'debug';

/**
 * Standardized error types across the application based on the error handling matrix
 * from technical specifications
 */
export const ERROR_TYPES = {
    VALIDATION_ERROR: 'ValidationError',    // For data validation failures
    AUTHENTICATION_ERROR: 'AuthenticationError', // For auth/security issues
    DATABASE_ERROR: 'DatabaseError',        // For database connection/query issues
    NETWORK_ERROR: 'NetworkError',          // For API timeouts and connection issues
    FLOW_ERROR: 'FlowError',               // For test flow execution failures
    SCHEMA_ERROR: 'SchemaError'            // For schema validation/mismatch issues
} as const;

// Initialize debug logger for errors
const ERROR_LOGGER = debug('test-framework:errors');

/**
 * Interface for standardized error objects
 */
interface StandardError {
    type: typeof ERROR_TYPES[keyof typeof ERROR_TYPES];
    message: string;
    timestamp: string;
    stack?: string;
}

/**
 * Internal function to log errors using debug package
 * Implements standardized error logging as per error handling matrix
 * 
 * @param error - The error object to be logged
 */
function logError(error: StandardError): void {
    const logMessage = {
        type: error.type,
        message: error.message,
        timestamp: error.timestamp,
        stack: error.stack
    };
    
    // Format error for logging with consistent structure
    ERROR_LOGGER(JSON.stringify(logMessage, null, 2));
}

/**
 * Creates a standardized error object with specified type and message
 * Implements error creation standards from error handling matrix
 * 
 * @param type - The type of error from ERROR_TYPES
 * @param message - Descriptive error message
 * @returns StandardError object with type, message, and timestamp
 * @throws Error if invalid error type is provided
 */
export function createError(
    type: keyof typeof ERROR_TYPES,
    message: string
): StandardError {
    // Validate error type
    if (!Object.keys(ERROR_TYPES).includes(type)) {
        throw new Error(`Invalid error type: ${type}`);
    }

    // Create standardized error object
    const error: StandardError = {
        type: ERROR_TYPES[type],
        message,
        timestamp: new Date().toISOString(),
        stack: new Error().stack
    };

    // Log error using internal logging function
    logError(error);

    return error;
}

/**
 * Type guard to check if an error is of a specific type
 * Supports error handling and recovery actions as defined in error matrix
 * 
 * @param error - The error object to check
 * @param type - The error type to validate against
 * @returns boolean indicating if error matches specified type
 */
export function isErrorType(
    error: any,
    type: keyof typeof ERROR_TYPES
): error is StandardError {
    return (
        error &&
        typeof error === 'object' &&
        'type' in error &&
        'message' in error &&
        'timestamp' in error &&
        error.type === ERROR_TYPES[type]
    );
}

/**
 * Type assertion to ensure error object has required properties
 * 
 * @param error - The error object to validate
 * @throws TypeError if error object is invalid
 */
function assertIsStandardError(error: any): asserts error is StandardError {
    if (!error || typeof error !== 'object') {
        throw new TypeError('Invalid error object');
    }

    if (!('type' in error) || !('message' in error) || !('timestamp' in error)) {
        throw new TypeError('Error object missing required properties');
    }

    if (!Object.values(ERROR_TYPES).includes(error.type)) {
        throw new TypeError(`Invalid error type: ${error.type}`);
    }
}