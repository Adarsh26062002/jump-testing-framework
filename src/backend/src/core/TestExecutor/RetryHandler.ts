// External dependencies
// async v3.2.0 - For managing asynchronous operations and retry logic
import { retry } from 'async';

// Internal dependencies
import { createError, isErrorType, ERROR_TYPES } from '../../utils/errors';
import { logMessage } from '../../utils/logger';

/**
 * Global retry configuration based on system specifications
 * Implements retry strategy from error handling matrix
 */
const RETRY_CONFIG = {
    maxAttempts: 3,
    backoffStrategy: 'exponential' as const,
    initialDelay: 1000
};

/**
 * Interface for retry options that can be customized per operation
 */
interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    backoffMultiplier?: number;
}

/**
 * Calculates the delay for the next retry attempt using exponential backoff
 * 
 * @param attempt - Current attempt number (1-based)
 * @param initialDelay - Initial delay in milliseconds
 * @returns Delay in milliseconds for the next attempt
 */
function calculateBackoffDelay(attempt: number, initialDelay: number): number {
    // Exponential backoff: initialDelay * (2 ^ (attempt - 1))
    return initialDelay * Math.pow(2, attempt - 1);
}

/**
 * Determines if an error is retryable based on error type
 * Implements retry strategy from error handling matrix
 * 
 * @param error - Error to check
 * @returns boolean indicating if the error is retryable
 */
function isRetryableError(error: any): boolean {
    // Network and Database errors are retryable according to error matrix
    return (
        isErrorType(error, 'NETWORK_ERROR') ||
        isErrorType(error, 'DATABASE_ERROR') ||
        // Flow errors are retryable with limited attempts
        isErrorType(error, 'FLOW_ERROR')
    );
}

/**
 * Executes a given function with retry logic, applying a backoff strategy between attempts
 * Implements retry logic according to system architecture specifications
 * 
 * @param operation - Function to execute with retry logic
 * @param args - Arguments to pass to the operation function
 * @param options - Optional retry configuration overrides
 * @returns Promise that resolves with operation result or rejects after all retries
 */
export async function executeWithRetry<T>(
    operation: (...args: any[]) => Promise<T>,
    args: any[],
    options: RetryOptions = {}
): Promise<T> {
    const maxAttempts = options.maxAttempts || RETRY_CONFIG.maxAttempts;
    const initialDelay = options.initialDelay || RETRY_CONFIG.initialDelay;
    const backoffMultiplier = options.backoffMultiplier || 2;

    let attempt = 1;

    // Create retry configuration for async.retry
    const retryConfig = {
        times: maxAttempts,
        interval: function(retryCount: number) {
            const delay = calculateBackoffDelay(retryCount, initialDelay);
            return Math.min(delay, 30000); // Cap at 30 seconds
        },
        errorFilter: function(err: any) {
            return isRetryableError(err);
        }
    };

    try {
        // Execute operation with retry logic
        return await new Promise<T>((resolve, reject) => {
            retry(retryConfig, async (retryCb) => {
                try {
                    // Log attempt information
                    logMessage('info', `Executing operation attempt ${attempt}/${maxAttempts}`);
                    
                    // Execute the operation
                    const result = await operation(...args);
                    
                    // Log success
                    logMessage('info', `Operation succeeded on attempt ${attempt}`);
                    
                    retryCb(null, result);
                } catch (error) {
                    // Log error details
                    logMessage('error', `Operation failed on attempt ${attempt}: ${error.message}`);
                    
                    if (!isRetryableError(error)) {
                        // Non-retryable errors should fail immediately
                        return retryCb(error);
                    }

                    // Calculate next attempt delay
                    const nextDelay = calculateBackoffDelay(attempt, initialDelay);
                    logMessage('info', `Retrying in ${nextDelay}ms...`);
                    
                    attempt++;
                    retryCb(error);
                }
            }, (err, result) => {
                if (err) {
                    // Create standardized error for final failure
                    const finalError = createError(
                        'FLOW_ERROR',
                        `Operation failed after ${maxAttempts} attempts: ${err.message}`
                    );
                    reject(finalError);
                } else {
                    resolve(result);
                }
            });
        });
    } catch (error) {
        // Ensure any unexpected errors are properly formatted
        throw createError(
            'FLOW_ERROR',
            `Unexpected error in retry handler: ${error.message}`
        );
    }
}