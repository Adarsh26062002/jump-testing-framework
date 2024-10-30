/**
 * Database Types and Interfaces
 * This file defines the core database model types and interfaces used throughout the application
 * to ensure type safety and consistent data handling across database operations.
 * 
 * Requirements addressed:
 * - Database Model Type Definitions (system_design.database_design.test_data_storage)
 * - Provides type definitions aligned with the PostgreSQL schema
 */

/**
 * Base interface for all database models
 * Implements common fields that must be present in all database entities
 */
export interface DatabaseModel {
  /** Unique identifier for the database record (UUID v4) */
  id: string;
  
  /** Timestamp when the record was created */
  createdAt: Date;
  
  /** Timestamp when the record was last updated */
  updatedAt: Date;
}

/**
 * Interface for DataSet entities
 * Represents individual data instances within a TestData collection
 */
export interface DataSetModel extends DatabaseModel {
  /** Reference to the parent TestData entity */
  dataId: string;
  
  /** Dynamic values stored as key-value pairs */
  values: Record<string, any>;
  
  /** Current status of the dataset (e.g., 'active', 'archived', 'invalid') */
  status: string;
}

/**
 * Interface for TestCase entities
 * Defines the structure for test cases within test suites
 */
export interface TestCaseModel extends DatabaseModel {
  /** Reference to the parent TestSuite */
  suiteId: string;
  
  /** Name of the test case */
  name: string;
  
  /** Type of flow (e.g., 'api', 'database', 'integration') */
  flowType: string;
  
  /** Configuration parameters for the test case */
  config: Record<string, any>;
  
  /** Current status of the test case (e.g., 'pending', 'running', 'completed', 'failed') */
  status: string;
}

/**
 * Interface for TestData entities
 * Defines the structure for test data templates and schemas
 */
export interface TestDataModel extends DatabaseModel {
  /** Name of the test data template */
  name: string;
  
  /** Scope of the test data (e.g., 'global', 'suite', 'case') */
  scope: string;
  
  /** JSON schema defining the structure of the test data */
  schema: Record<string, any>;
  
  /** Start of validity period for the test data */
  validFrom: Date;
  
  /** End of validity period for the test data */
  validTo: Date;
}

/**
 * Interface for TestStep entities
 * Defines individual steps within a test case
 */
export interface TestStepModel extends DatabaseModel {
  /** Reference to the parent TestCase */
  caseId: string;
  
  /** Operation to be performed in this step */
  operation: string;
  
  /** Request parameters or payload for the step */
  request: Record<string, any>;
  
  /** Expected results or assertions for the step */
  expected: Record<string, any>;
  
  /** Order of execution within the test case */
  sequence: number;
}

/**
 * Generic interface for database query results
 * Provides type safety for database operation responses
 */
export interface QueryResult<T> {
  /** Array of rows returned by the query */
  rows: Array<T>;
  
  /** Total number of rows affected/returned */
  rowCount: number;
}