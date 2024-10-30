/**
 * Response Validator
 * Implements validation mechanisms for GraphQL and REST API responses
 * to ensure they conform to expected schemas and data integrity requirements.
 * 
 * Requirements addressed:
 * - Response Validation (system_architecture.core_testing_components)
 * - Implements validation standards from error handling matrix
 */

// External dependencies
// ajv v6.12.6 - JSON Schema validator
import Ajv from 'ajv';

// Internal dependencies
import { validateData } from '../../utils/validation';
import { createError } from '../../utils/errors';
import { logMessage } from '../../utils/logger';

// Types for response validation
interface DataSchema {
    name: string;
    schema: object;
}

interface GraphQLResponse {
    data: any;
    errors?: Array<{
        message: string;
        locations?: Array<{ line: number; column: number }>;
        path?: Array<string | number>;
    }>;
}

interface RESTResponse {
    status: number;
    data: any;
    headers: Record<string, string>;
}

/**
 * Validates a GraphQL response against the expected schema
 * Implements validation standards from error handling matrix
 * 
 * @param response - The GraphQL response to validate
 * @param schema - The schema to validate against
 * @returns true if validation succeeds
 * @throws ValidationError if validation fails
 */
export function validateGraphQLResponse(
    response: GraphQLResponse,
    schema: DataSchema
): boolean {
    // Log validation start
    logMessage('debug', `Starting GraphQL response validation against schema: ${schema.name}`);

    try {
        // Check for GraphQL-specific errors first
        if (response.errors && response.errors.length > 0) {
            const errorMessages = response.errors
                .map(err => err.message)
                .join('; ');

            throw createError(
                'VALIDATION_ERROR',
                `GraphQL response contains errors: ${errorMessages}`
            );
        }

        // Validate response data against schema
        if (!response.data) {
            throw createError(
                'VALIDATION_ERROR',
                'GraphQL response is missing data field'
            );
        }

        // Use validateData utility to check against schema
        const isValid = validateData(response.data, schema);

        // Log successful validation
        logMessage('info', `GraphQL response validation successful for schema: ${schema.name}`);

        return isValid;
    } catch (error) {
        // Log validation failure
        logMessage('error', `GraphQL response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // If it's already a ValidationError, rethrow it
        if (error && typeof error === 'object' && 'type' in error && error.type === 'ValidationError') {
            throw error;
        }

        // Otherwise, create and throw a new ValidationError
        throw createError(
            'VALIDATION_ERROR',
            `GraphQL response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Validates a REST API response against the expected schema
 * Implements validation standards from error handling matrix
 * 
 * @param response - The REST response to validate
 * @param schema - The schema to validate against
 * @returns true if validation succeeds
 * @throws ValidationError if validation fails
 */
export function validateRESTResponse(
    response: RESTResponse,
    schema: DataSchema
): boolean {
    // Log validation start
    logMessage('debug', `Starting REST response validation against schema: ${schema.name}`);

    try {
        // Check HTTP status code first
        if (response.status < 200 || response.status >= 300) {
            throw createError(
                'VALIDATION_ERROR',
                `REST response has invalid status code: ${response.status}`
            );
        }

        // Validate response data against schema
        if (response.data === undefined) {
            throw createError(
                'VALIDATION_ERROR',
                'REST response is missing data field'
            );
        }

        // Use validateData utility to check against schema
        const isValid = validateData(response.data, schema);

        // Log successful validation
        logMessage('info', `REST response validation successful for schema: ${schema.name}`);

        return isValid;
    } catch (error) {
        // Log validation failure
        logMessage('error', `REST response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // If it's already a ValidationError, rethrow it
        if (error && typeof error === 'object' && 'type' in error && error.type === 'ValidationError') {
            throw error;
        }

        // Otherwise, create and throw a new ValidationError
        throw createError(
            'VALIDATION_ERROR',
            `REST response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}