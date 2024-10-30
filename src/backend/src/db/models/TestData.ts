/**
 * TestData Model Implementation
 * Represents a collection of test data entries with associated metadata and operations.
 * 
 * Requirements addressed:
 * - TestData Model Definition (system_design.database_design.test_data_storage)
 * - Implements the TestData entity as per the database schema
 */

// External dependencies
import { Pool } from 'pg'; // v8.5.1

// Internal dependencies
import { DataSet } from './DataSet';
import { DatabaseModel, TestDataModel } from '../../types/db.types';

/**
 * TestData class implementing the TestDataModel interface
 * Manages test data templates and their associated schemas
 */
export class TestData implements TestDataModel {
    // DatabaseModel required fields
    public id: string;
    public createdAt: Date;
    public updatedAt: Date;

    // TestDataModel specific fields
    public name: string;
    public scope: string;
    public schema: Record<string, any>;
    public validFrom: Date;
    public validTo: Date;

    /**
     * Constructs a new TestData instance
     * @param name - Name of the test data template
     * @param scope - Scope of the test data
     * @param schema - JSON schema defining the structure
     * @param validFrom - Start of validity period
     * @param validTo - End of validity period
     */
    constructor(
        name: string,
        scope: string,
        schema: Record<string, any>,
        validFrom: Date,
        validTo: Date
    ) {
        this.id = crypto.randomUUID(); // Generate UUID v4
        this.name = name;
        this.scope = scope;
        this.schema = schema;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Validates the schema of the TestData against predefined rules
     * @returns boolean indicating whether the schema is valid
     */
    public validateSchema(): boolean {
        try {
            // Ensure required fields are present
            if (!this.schema || typeof this.schema !== 'object') {
                return false;
            }

            // Validate name format and length
            if (!this.name || typeof this.name !== 'string' || this.name.length < 3) {
                return false;
            }

            // Validate scope is one of the allowed values
            const validScopes = ['global', 'suite', 'case'];
            if (!validScopes.includes(this.scope)) {
                return false;
            }

            // Validate schema structure
            if (!this.schema.properties || typeof this.schema.properties !== 'object') {
                return false;
            }

            // Validate validity period
            if (!(this.validFrom instanceof Date) || !(this.validTo instanceof Date)) {
                return false;
            }

            if (this.validFrom >= this.validTo) {
                return false;
            }

            // All validations passed
            return true;
        } catch (error) {
            console.error('Error validating TestData schema:', error);
            return false;
        }
    }

    /**
     * Updates the validity period of the TestData
     * @param newValidFrom - New start date for validity period
     * @param newValidTo - New end date for validity period
     */
    public updateValidity(newValidFrom: Date, newValidTo: Date): void {
        // Validate new validity period
        if (!(newValidFrom instanceof Date) || !(newValidTo instanceof Date)) {
            throw new Error('Invalid date format provided for validity period');
        }

        if (newValidFrom >= newValidTo) {
            throw new Error('Valid from date must be before valid to date');
        }

        // Update validity period
        this.validFrom = newValidFrom;
        this.validTo = newValidTo;
        this.updatedAt = new Date();
    }

    /**
     * Converts the TestData instance to a plain object for database operations
     * @returns Object representation of the TestData
     */
    public toJSON(): Record<string, any> {
        return {
            id: this.id,
            name: this.name,
            scope: this.scope,
            schema: this.schema,
            valid_from: this.validFrom,
            valid_to: this.validTo,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }
}

/**
 * Initializes a new TestData instance with default values and schema validation
 * @param data - Initial data for the TestData
 * @returns A new instance of TestData
 */
export function initializeTestData(data: Partial<TestDataModel>): TestData {
    // Set default values for required fields
    const defaultData = {
        name: data.name || '',
        scope: data.scope || 'global',
        schema: data.schema || { properties: {} },
        validFrom: data.validFrom || new Date(),
        validTo: data.validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default 1 year validity
    };

    // Create and validate new instance
    const testData = new TestData(
        defaultData.name,
        defaultData.scope,
        defaultData.schema,
        defaultData.validFrom,
        defaultData.validTo
    );

    if (!testData.validateSchema()) {
        throw new Error('Invalid TestData schema provided');
    }

    return testData;
}