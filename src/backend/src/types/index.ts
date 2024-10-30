/**
 * Central Type Export File
 * Version: 1.0.0
 * 
 * This file serves as the central export point for all TypeScript types and interfaces
 * used across the backend services. It consolidates and re-exports types from various
 * modules to ensure consistent type usage across the application.
 * 
 * Requirements addressed:
 * - Centralized Type Exports (system_architecture.component_configuration)
 * - Provides a single entry point for importing types, ensuring consistency
 *   and ease of maintenance across the backend codebase.
 */

// API Types - GraphQL and REST client configurations
export type {
  GraphQLClientConfig,
  GraphQLResponse,
  RESTClientConfig,
  RESTResponse,
} from './api.types';

// Data Schema and Validation Types
export type {
  DataSchema,
  DataTransformation,
} from './data.types';

// Database Model Types
export type {
  DatabaseModel,
  DataSetModel,
  TestCaseModel,
  TestDataModel,
  TestStepModel,
  QueryResult,
} from './db.types';

// Test Structure Types
export type {
  TestCase,
  TestStep,
  TestData,
} from './test.types';

// Re-export type guards from their respective modules
export {
  isGraphQLResponse,
  isRESTResponse,
} from './api.types';

export {
  isDataSchema,
  isDataTransformation,
} from './data.types';

/**
 * Type guard to ensure a value implements the DatabaseModel interface
 * @param value - The value to check
 * @returns Boolean indicating if the value is a DatabaseModel
 */
export function isDatabaseModel(value: any): value is DatabaseModel {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    value.createdAt instanceof Date &&
    value.updatedAt instanceof Date
  );
}

/**
 * Type guard to ensure a value implements the TestCase interface
 * @param value - The value to check
 * @returns Boolean indicating if the value is a TestCase
 */
export function isTestCase(value: any): value is TestCase {
  return (
    isDatabaseModel(value) &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.suiteId === 'string' &&
    typeof value.flowType === 'string' &&
    typeof value.config === 'object' &&
    typeof value.status === 'string'
  );
}