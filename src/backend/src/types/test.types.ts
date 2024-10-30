/**
 * Test Types and Interfaces
 * This file defines TypeScript interfaces and types related to test structures used in the backend services.
 * It includes types for test cases, test steps, and test data to ensure consistent type usage across testing components.
 * 
 * Requirements addressed:
 * - Test Type Definitions (system_architecture.core_testing_components)
 * - Provides type definitions for test cases, steps, and data to ensure consistency and type safety
 */

import { DatabaseModel, TestCaseModel, TestStepModel } from './db.types';

/**
 * Interface defining the structure of a test case.
 * Extends DatabaseModel to include common fields (id, createdAt, updatedAt)
 * and incorporates specific test case properties from TestCaseModel.
 */
export interface TestCase extends DatabaseModel {
  /** Unique identifier for the test case */
  id: string;

  /** Name of the test case */
  name: string;

  /** Detailed description of the test case's purpose and behavior */
  description: string;

  /** Reference to the parent test suite */
  suiteId: string;

  /** Type of flow this test case represents (e.g., 'api', 'database', 'integration') */
  flowType: string;

  /** Configuration parameters for test case execution */
  config: Record<string, any>;

  /** Current execution status of the test case */
  status: string;
}

/**
 * Interface defining the structure of a test step.
 * Extends DatabaseModel to include common fields (id, createdAt, updatedAt)
 * and incorporates specific test step properties from TestStepModel.
 */
export interface TestStep extends DatabaseModel {
  /** Unique identifier for the test step */
  id: string;

  /** Reference to the parent test case */
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
 * Interface defining the structure of test data.
 * Extends DatabaseModel to include common fields (id, createdAt, updatedAt)
 * and defines specific test data properties.
 */
export interface TestData extends DatabaseModel {
  /** Unique identifier for the test data */
  id: string;

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