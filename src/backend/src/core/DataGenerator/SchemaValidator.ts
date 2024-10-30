/**
 * Schema Validator
 * This file is responsible for validating data schemas used in the data generation process.
 * It ensures that data conforms to the expected structure before it is used for generating
 * or seeding test data.
 * 
 * Requirements addressed:
 * - Schema Validation (system_architecture.data_generation_flow)
 * - Ensures data schemas are validated before being used in data generation and seeding processes
 */

// External dependencies
// ajv v6.12.6 - JSON Schema validator
import Ajv from 'ajv';

// Internal dependencies
import { validateData } from '../../utils/validation';
import { DataSchema } from '../../types/data.types';

/**
 * Validates a given data schema to ensure it meets the required structure and constraints.
 * This function is used before any data generation or seeding process to maintain
 * data integrity and consistency.
 * 
 * @param schema - The data schema to validate
 * @returns true if the schema is valid
 * @throws ValidationError if the schema is invalid or validation fails
 */
export function validateSchema(schema: DataSchema): boolean {
    // First, validate that the schema object itself is properly structured
    if (!schema || typeof schema !== 'object') {
        throw new Error('Invalid schema: Schema must be a valid object');
    }

    // Validate required schema properties
    if (!schema.name || typeof schema.name !== 'string') {
        throw new Error('Invalid schema: Name is required and must be a string');
    }

    if (!schema.description || typeof schema.description !== 'string') {
        throw new Error('Invalid schema: Description is required and must be a string');
    }

    if (!schema.schema || typeof schema.schema !== 'object') {
        throw new Error('Invalid schema: Schema definition is required and must be an object');
    }

    // Define meta-schema for validating schema structure
    const metaSchema: DataSchema = {
        name: 'schema-validator',
        description: 'Meta-schema for validating data schemas',
        schema: {
            type: 'object',
            required: ['type', 'properties'],
            properties: {
                type: { type: 'string', enum: ['object'] },
                required: { 
                    type: 'array',
                    items: { type: 'string' }
                },
                properties: {
                    type: 'object',
                    additionalProperties: {
                        type: 'object',
                        required: ['type'],
                        properties: {
                            type: { type: 'string' },
                            description: { type: 'string' },
                            format: { type: 'string' },
                            minimum: { type: 'number' },
                            maximum: { type: 'number' },
                            minLength: { type: 'number' },
                            maxLength: { type: 'number' },
                            pattern: { type: 'string' },
                            enum: {
                                type: 'array',
                                items: {}
                            },
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                additionalProperties: { type: 'boolean' }
            }
        }
    };

    try {
        // Use the validateData function from utils/validation to validate the schema
        // against the meta-schema definition
        const isValid = validateData(schema.schema, metaSchema);

        // If validation passes, verify that the schema can be compiled by AJV
        // This ensures the schema is not only structurally valid but also
        // semantically correct according to JSON Schema standards
        try {
            const ajv = new Ajv({ strict: true });
            ajv.compile(schema.schema);
        } catch (error) {
            throw new Error(`Schema compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return isValid;
    } catch (error) {
        // Enhance the error message with schema context
        const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
        throw new Error(`Schema validation failed for "${schema.name}": ${errorMessage}`);
    }
}