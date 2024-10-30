/**
 * Database Configuration Module
 * Provides configuration settings for database connections and pool management.
 * 
 * Requirements addressed:
 * - Database Configuration (system_architecture.database_integration_layer)
 * - Component Configuration (system_architecture.component_configuration)
 * 
 * @module config/database.config
 */

// dotenv v8.2.0 - Load environment variables from .env file
import * as dotenv from 'dotenv';
import { DatabaseModel } from '../types/db.types';

// Load environment variables at module initialization
dotenv.config();

/**
 * Interface defining the structure of database configuration
 * Based on the global DB_CONFIG type definition from specification
 */
interface DatabaseConfig {
  /** Database host address */
  host: string;
  
  /** Database port number */
  port: number;
  
  /** Database user name */
  user: string;
  
  /** Database password */
  password: string;
  
  /** Database name */
  database: string;
  
  /** Maximum number of clients in the connection pool */
  max: number;
  
  /** Idle timeout in milliseconds */
  idleTimeoutMillis: number;
}

/**
 * Loads and validates database configuration from environment variables
 * Default values are aligned with system_architecture.component_configuration
 * 
 * @returns {DatabaseConfig} Validated database configuration object
 * @throws {Error} If required environment variables are missing
 */
export const loadDatabaseConfig = (): DatabaseConfig => {
  // Validate required environment variables
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  ];

  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missingVars.join(', ')}`
    );
  }

  // Return validated configuration object
  return {
    // Connection parameters
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,

    // Pool configuration
    // Default pool size from component configuration: 10
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    // Default idle timeout from component configuration: 10000ms
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10)
  };
};

/**
 * Type guard to validate if an object conforms to DatabaseModel interface
 * Useful for runtime type checking of database entities
 * 
 * @param {any} obj - Object to validate
 * @returns {boolean} True if object implements DatabaseModel interface
 */
export const isDatabaseModel = (obj: any): obj is DatabaseModel => {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
};