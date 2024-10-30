/**
 * Validation Utilities
 * This file provides utilities for validating data structures and input parameters
 * across the application using AJV for JSON schema validation.
 * 
 * Requirements addressed:
 * - Data Validation Utilities (system_architecture.component_responsibilities)
 * - Implements error handling matrix standards for validation errors
 */

// External dependencies
// ajv v6.12.6 - JSON Schema validator
import Ajv from 'ajv';

// Internal dependencies
import { DataSchema } from '../types/data.types';
import { createError } from './errors';
import { logMessage } from './logger';

// Initialize AJV instance with strict mode and all errors
const ajv = new Ajv({
    allErrors: true,
    removeAdditional: false,
    useDefaults: true,
    coerceTypes: false
});

/**
 * Cache for compiled validation functions to improve performance
 * Key: Schema name, Value: Compiled validation function
 */
const validationCache = new Map<string, Ajv.ValidateFunction>();

/**
 * Clears the validation cache
 * Useful when schemas are updated or during testing
 */
function clearValidationCache(): void {
    validationCache.clear();
    logMessage('debug', 'Validation cache cleared');
}

/**
 * Gets or creates a compiled validation function for a schema
 * 
 * @param schema - The schema to compile
 * @returns Compiled validation function
 * @throws ValidationError if schema compilation fails
 */
function getValidationFunction(schema: DataSchema): Ajv.ValidateFunction {
    // Check cache first
    const cached = validationCache.get(schema.name);
    if (cached) {
        return cached;
    }

    try {
        // Compile schema
        const validate = ajv.compile(schema.schema);
        // Cache the compiled function
        validationCache.set(schema.name, validate);
        
        logMessage('debug', `Compiled validation function for schema: ${schema.name}`);
        return validate;
    } catch (error) {
        const validationError = createError(
            'VALIDATION_ERROR',
            `Failed to compile schema ${schema.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw validationError;
    }
}

/**
 * Formats validation errors into a readable string
 * 
 * @param errors - Array of AJV validation errors
 * @returns Formatted error message
 */
function formatValidationErrors(errors: Ajv.ErrorObject[]): string {
    return errors
        .map(err => {
            const path = err.dataPath || '';
            const message = err.message || '';
            return `${path} ${message}`.trim();
        })
        .join('; ');
}

/**
 * Validates data against a specified schema using AJV
 * Implements validation standards from error handling matrix
 * 
 * @param data - The data to validate
 * @param schema - The schema to validate against
 * @returns true if validation succeeds
 * @throws ValidationError if validation fails
 */
export function validateData(data: any, schema: DataSchema): boolean {
    // Log validation attempt
    logMessage('debug', `Validating data against schema: ${schema.name}`);

    try {
        // Get or create validation function
        const validate = getValidationFunction(schema);

        // Perform validation
        const isValid = validate(data);

        if (!isValid) {
            // Format validation errors
            const errorMessage = formatValidationErrors(validate.errors || []);
            
            // Create standardized validation error
            const validationError = createError(
                'VALIDATION_ERROR',
                `Validation failed for schema ${schema.name}: ${errorMessage}`
            );

            // Log validation failure
            logMessage('error', `Validation error: ${errorMessage}`);
            
            throw validationError;
        }

        // Log validation success
        logMessage('debug', `Validation successful for schema: ${schema.name}`);
        
        return true;
    } catch (error) {
        // If error is already a ValidationError, rethrow it
        if (error && typeof error === 'object' && 'type' in error && error.type === 'ValidationError') {
            throw error;
        }

        // Otherwise, create a new ValidationError
        const validationError = createError(
            'VALIDATION_ERROR',
            `Unexpected error during validation for schema ${schema.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        
        throw validationError;
    }
}

// Export validation cache management for testing purposes
export const __test__ = {
    clearValidationCache,
    getValidationFunction
};