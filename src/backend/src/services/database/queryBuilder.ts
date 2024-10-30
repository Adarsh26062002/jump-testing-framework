/**
 * Query Builder Implementation
 * Provides utilities for building and executing dynamic SQL queries with parameterization.
 * 
 * Requirements addressed:
 * - Dynamic Query Building (system_architecture.database_integration_layer)
 * - Secure and efficient database interactions
 */

// Internal dependencies
import { executeQuery } from './client';
import { QueryResult } from '../../types/db.types';
import { logMessage } from '../../utils/logger';

/**
 * Builds an INSERT SQL query string with parameterized values
 * 
 * @param tableName - The name of the table to insert into
 * @param data - Object containing column-value pairs to insert
 * @returns Constructed INSERT query string and parameter values array
 */
export function buildInsertQuery(
  tableName: string,
  data: Record<string, any>
): { query: string; values: any[] } {
  // Extract column names and values
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  // Generate the parameter placeholders ($1, $2, etc.)
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  
  // Construct the INSERT query
  const query = `
    INSERT INTO ${tableName} 
    (${columns.join(', ')}) 
    VALUES (${placeholders})
    RETURNING *
  `;

  return { query, values };
}

/**
 * Builds an UPDATE SQL query string with parameterized values
 * 
 * @param tableName - The name of the table to update
 * @param data - Object containing column-value pairs to update
 * @param conditions - Object containing WHERE clause conditions
 * @returns Constructed UPDATE query string and parameter values array
 */
export function buildUpdateQuery(
  tableName: string,
  data: Record<string, any>,
  conditions: Record<string, any>
): { query: string; values: any[] } {
  const updates = Object.keys(data);
  const whereConditions = Object.keys(conditions);
  
  // Generate SET clause with parameterized values
  const setClause = updates
    .map((col, index) => `${col} = $${index + 1}`)
    .join(', ');
  
  // Generate WHERE clause with parameterized values
  const whereClause = whereConditions
    .map((col, index) => `${col} = $${index + updates.length + 1}`)
    .join(' AND ');
  
  // Construct the UPDATE query
  const query = `
    UPDATE ${tableName} 
    SET ${setClause} 
    WHERE ${whereClause}
    RETURNING *
  `;
  
  // Combine values from data and conditions in correct order
  const values = [...Object.values(data), ...Object.values(conditions)];
  
  return { query, values };
}

/**
 * Executes an INSERT query with the given table name and data
 * 
 * @param tableName - The name of the table to insert into
 * @param data - Object containing column-value pairs to insert
 * @returns Promise resolving to the query result
 */
export async function executeInsertQuery(
  tableName: string,
  data: Record<string, any>
): Promise<QueryResult<any>> {
  try {
    // Build the query and get values
    const { query, values } = buildInsertQuery(tableName, data);
    
    // Log query execution start
    logMessage('info', `Executing INSERT query on table ${tableName}`);
    
    // Execute the query with parameters
    const result = await executeQuery(query, values);
    
    // Log successful execution
    logMessage('info', `Successfully inserted data into ${tableName}. Rows affected: ${result.rowCount}`);
    
    return result;
  } catch (error) {
    // Log error and rethrow
    logMessage('error', `Failed to execute INSERT query on ${tableName}: ${error.message}`);
    throw error;
  }
}

/**
 * Executes an UPDATE query with the given table name, data, and conditions
 * 
 * @param tableName - The name of the table to update
 * @param data - Object containing column-value pairs to update
 * @param conditions - Object containing WHERE clause conditions
 * @returns Promise resolving to the query result
 */
export async function executeUpdateQuery(
  tableName: string,
  data: Record<string, any>,
  conditions: Record<string, any>
): Promise<QueryResult<any>> {
  try {
    // Build the query and get values
    const { query, values } = buildUpdateQuery(tableName, data, conditions);
    
    // Log query execution start
    logMessage('info', `Executing UPDATE query on table ${tableName}`);
    
    // Execute the query with parameters
    const result = await executeQuery(query, values);
    
    // Log successful execution
    logMessage('info', `Successfully updated data in ${tableName}. Rows affected: ${result.rowCount}`);
    
    return result;
  } catch (error) {
    // Log error and rethrow
    logMessage('error', `Failed to execute UPDATE query on ${tableName}: ${error.message}`);
    throw error;
  }
}