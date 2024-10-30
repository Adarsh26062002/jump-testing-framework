// External dependencies
// winston v3.3.3 - Logging framework
import * as winston from 'winston';
import { createError } from './errors';

/**
 * Valid log levels based on winston's default levels
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Custom format that includes timestamp and structured data
 */
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

/**
 * Global logger instance configured with JSON format and console transport
 * Implements logging configuration as per system architecture specifications
 */
export const LOGGER = winston.createLogger({
    level: 'info',
    format: customFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ],
    // Prevent winston from exiting on uncaught exceptions
    exitOnError: false
});

/**
 * Validates if the provided log level is valid
 * 
 * @param level - The log level to validate
 * @returns boolean indicating if the level is valid
 */
function isValidLogLevel(level: string): level is LogLevel {
    return Object.keys(LOG_LEVELS).includes(level);
}

/**
 * Formats the log message with additional metadata
 * 
 * @param message - The message to format
 * @returns Formatted message object with metadata
 */
function formatLogMessage(message: string) {
    return {
        message,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'test-framework'
    };
}

/**
 * Logs a message with the specified level using the winston logger
 * Implements logging standards from system architecture specifications
 * 
 * @param level - The log level (error, warn, info, http, verbose, debug, silly)
 * @param message - The message to log
 * @throws ValidationError if invalid log level is provided
 */
export function logMessage(level: string, message: string): void {
    // Validate log level
    if (!isValidLogLevel(level)) {
        const error = createError(
            'VALIDATION_ERROR',
            `Invalid log level: ${level}. Valid levels are: ${Object.keys(LOG_LEVELS).join(', ')}`
        );
        // Log the error and throw
        LOGGER.error(error);
        throw error;
    }

    // Format the message with metadata
    const formattedMessage = formatLogMessage(message);

    // Log the message using the appropriate level
    LOGGER[level](formattedMessage);
}

// Add error event handler to prevent crashes from logger errors
LOGGER.on('error', (error) => {
    console.error('Logger error occurred:', error);
    // Create and log error using standardized error handling
    createError('FLOW_ERROR', `Logger error: ${error.message}`);
});

// Export the winston logger instance for advanced usage if needed
export { LOGGER as winston };

// Export log levels for external use
export { LOG_LEVELS };