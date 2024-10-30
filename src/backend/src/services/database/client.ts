/**
 * Database Client Implementation
 * Manages connections, executes queries, and handles transactions with PostgreSQL database.
 * 
 * Requirements addressed:
 * - Database Client Implementation (system_architecture.database_integration_layer)
 * - Efficient and secure database operations
 */

// pg v8.7.1 - PostgreSQL client for Node.js
import { Client, QueryResult } from 'pg';

// Internal dependencies
import { loadDatabaseConfig } from '../../config/database.config';
import { DatabaseModel } from '../../types/db.types';

/**
 * Global database client instance
 * Initialized with configuration from loadDatabaseConfig
 */
const dbClient = new Client(loadDatabaseConfig());

/**
 * Establishes a connection to the PostgreSQL database
 * Uses configuration settings loaded from environment variables
 * 
 * @returns {Promise<void>} Resolves when connection is established
 * @throws {Error} If connection fails
 */
export const connect = async (): Promise<void> => {
  try {
    await dbClient.connect();
    console.log('Successfully connected to PostgreSQL database');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

/**
 * Closes the connection to the PostgreSQL database
 * Ensures proper cleanup of database resources
 * 
 * @returns {Promise<void>} Resolves when connection is closed
 */
export const disconnect = async (): Promise<void> => {
  try {
    if (dbClient) {
      await dbClient.end();
      console.log('Database connection closed successfully');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};

/**
 * Executes a parameterized SQL query
 * Provides safe query execution with parameter binding
 * 
 * @param {string} query - SQL query string with parameter placeholders
 * @param {Array<any>} params - Array of parameter values
 * @returns {Promise<QueryResult<any>>} Query results
 * @throws {Error} If query execution fails
 */
export const executeQuery = async (
  query: string,
  params: Array<any> = []
): Promise<QueryResult<any>> => {
  try {
    console.log('Executing query:', query, 'with params:', params);
    const result = await dbClient.query(query, params);
    console.log(`Query executed successfully. Rows affected: ${result.rowCount}`);
    return result;
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
};

/**
 * Builds a parameterized SELECT query string
 * Supports dynamic column selection and WHERE conditions
 * 
 * @param {string} tableName - Name of the table to query
 * @param {string[]} columns - Array of column names to select
 * @param {Record<string, any>} conditions - Key-value pairs for WHERE clause
 * @returns {string} Constructed SELECT query string
 */
export const buildSelectQuery = (
  tableName: string,
  columns: string[],
  conditions: Record<string, any> = {}
): string => {
  // Build SELECT clause
  const selectClause = columns.length > 0 
    ? columns.join(', ')
    : '*';

  // Start with base query
  let query = `SELECT ${selectClause} FROM ${tableName}`;

  // Add WHERE clause if conditions exist
  const conditionKeys = Object.keys(conditions);
  if (conditionKeys.length > 0) {
    const whereConditions = conditionKeys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    query += ` WHERE ${whereConditions}`;
  }

  return query;
};

/**
 * Executes a SELECT query with the given parameters
 * Combines buildSelectQuery and executeQuery for convenient data retrieval
 * 
 * @param {string} tableName - Name of the table to query
 * @param {string[]} columns - Array of column names to select
 * @param {Record<string, any>} conditions - Key-value pairs for WHERE clause
 * @returns {Promise<QueryResult<any>>} Query results
 */
export const executeSelectQuery = async (
  tableName: string,
  columns: string[],
  conditions: Record<string, any> = {}
): Promise<QueryResult<any>> => {
  // Build the query string
  const query = buildSelectQuery(tableName, columns, conditions);

  // Extract values from conditions in the same order as the keys
  const params = Object.values(conditions);

  // Execute the query with parameters
  return executeQuery(query, params);
};