/**
 * Data Types and Interfaces
 * This file defines TypeScript interfaces and types related to data schemas and validation
 * used across the backend services.
 * 
 * Requirements addressed:
 * - Data Schema Type Definitions (system_design.database_design.test_data_storage)
 * - Provides type definitions for data schemas and validation to ensure type safety
 */

import { DatabaseModel } from './db.types';

/**
 * Interface for defining data schema structures
 * Extends DatabaseModel to inherit common database fields
 * while adding specific fields for schema definitions
 */
export interface DataSchema {
  /** Name of the schema for identification purposes */
  name: string;

  /** 
   * The actual schema definition as a JSON object
   * This can include field definitions, validations, and constraints
   */
  schema: Record<string, any>;

  /** Detailed description of the schema's purpose and usage */
  description: string;
}

/**
 * Type definition for supported data types in transformations
 * Used to explicitly define source and target types in transformations
 */
type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'any';

/**
 * Interface for defining data transformation logic
 * Used to specify how data should be transformed between different schemas
 */
export interface DataTransformation {
  /** The original data type before transformation */
  sourceType: string;

  /** The target data type after transformation */
  targetType: string;

  /**
   * Transform function that converts data from source type to target type
   * @param input - The input data of the source type
   * @returns The transformed data in the target type
   */
  transform: (input: any) => any;
}

/**
 * Type guard to check if a value matches a DataSchema interface
 * @param value - The value to check
 * @returns Boolean indicating if the value is a DataSchema
 */
export function isDataSchema(value: any): value is DataSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.name === 'string' &&
    typeof value.schema === 'object' &&
    typeof value.description === 'string'
  );
}

/**
 * Type guard to check if a value matches a DataTransformation interface
 * @param value - The value to check
 * @returns Boolean indicating if the value is a DataTransformation
 */
export function isDataTransformation(value: any): value is DataTransformation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.sourceType === 'string' &&
    typeof value.targetType === 'string' &&
    typeof value.transform === 'function'
  );
}