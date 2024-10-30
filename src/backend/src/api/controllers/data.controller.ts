/**
 * Data Controller Implementation
 * Handles API requests related to data operations, including data retrieval, creation, and validation.
 * 
 * Requirements addressed:
 * - Data API Endpoints (system_design.api_design.api_endpoints)
 * - Implements endpoints for data operations with validation and security
 */

// External dependencies
// express v4.17.1
import { Request, Response } from 'express';

// Internal dependencies
import { authMiddleware } from '../middleware/auth.middleware';
import errorHandler from '../middleware/error.middleware';
import { logRequest } from '../middleware/logger.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { makeRequest } from '../../services/rest/client';
import { executeGraphQLQuery } from '../../services/graphql/client';
import { executeQuery } from '../../services/database/client';
import { validateData } from '../../utils/validation';
import { logMessage } from '../../utils/logger';

// Data validation schemas
const getDataSchema = {
    name: 'get_data_request',
    schema: {
        type: 'object',
        required: ['queryParams'],
        properties: {
            queryParams: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    type: { type: 'string' },
                    limit: { type: 'number', minimum: 1, maximum: 100 },
                    offset: { type: 'number', minimum: 0 }
                }
            }
        }
    }
};

const createDataSchema = {
    name: 'create_data_request',
    schema: {
        type: 'object',
        required: ['data'],
        properties: {
            data: {
                type: 'object',
                required: ['type', 'content'],
                properties: {
                    type: { type: 'string' },
                    content: { type: 'object' },
                    metadata: { type: 'object' }
                }
            }
        }
    }
};

/**
 * Handles GET requests to retrieve data based on provided query parameters
 * Implements data retrieval with validation, authentication, and error handling
 * 
 * @param req - Express request object containing query parameters
 * @param res - Express response object
 */
export const getData = async (req: Request, res: Response): Promise<void> => {
    try {
        // Log incoming request
        logRequest(req, res, () => {});
        logMessage('info', `Received getData request with params: ${JSON.stringify(req.query)}`);

        // Attach schema for validation
        req.schema = getDataSchema;

        // Validate request parameters
        validateRequest(req, res, async () => {
            try {
                // Extract query parameters
                const { id, type, limit = 10, offset = 0 } = req.query;

                // Build SQL query based on parameters
                const query = `
                    SELECT * FROM test_data 
                    WHERE ($1::text IS NULL OR id = $1)
                    AND ($2::text IS NULL OR type = $2)
                    LIMIT $3 OFFSET $4
                `;
                const params = [id, type, limit, offset];

                // Execute database query
                const result = await executeQuery(query, params);

                // Check if data was found
                if (result.rows.length === 0) {
                    logMessage('info', 'No data found for the given parameters');
                    res.status(404).json({
                        status: 'error',
                        message: 'No data found'
                    });
                    return;
                }

                // Enrich data with external information if needed
                const enrichedData = await Promise.all(result.rows.map(async (row) => {
                    try {
                        // Get additional data from REST API if available
                        const restData = await makeRequest('GET', `/api/external/${row.id}`, null);
                        
                        // Get additional data from GraphQL if available
                        const graphqlData = await executeGraphQLQuery(`
                            query GetAdditionalData($id: ID!) {
                                dataDetails(id: $id) {
                                    extendedInfo
                                    metadata
                                }
                            }
                        `, { id: row.id });

                        // Combine all data
                        return {
                            ...row,
                            restData: restData.data,
                            graphqlData: graphqlData.data?.dataDetails
                        };
                    } catch (error) {
                        // Log enrichment error but continue with base data
                        logMessage('warn', `Data enrichment failed for id ${row.id}: ${error.message}`);
                        return row;
                    }
                }));

                // Send successful response
                logMessage('info', `Successfully retrieved ${enrichedData.length} records`);
                res.status(200).json({
                    status: 'success',
                    data: enrichedData,
                    metadata: {
                        total: result.rowCount,
                        limit,
                        offset
                    }
                });
            } catch (error) {
                errorHandler(error, req, res, () => {});
            }
        });
    } catch (error) {
        errorHandler(error, req, res, () => {});
    }
};

/**
 * Handles POST requests to create new data entries
 * Implements data creation with validation, authentication, and error handling
 * 
 * @param req - Express request object containing data payload
 * @param res - Express response object
 */
export const createData = async (req: Request, res: Response): Promise<void> => {
    try {
        // Log incoming request
        logRequest(req, res, () => {});
        logMessage('info', 'Received createData request');

        // Attach schema for validation
        req.schema = createDataSchema;

        // Validate request body
        validateRequest(req, res, async () => {
            try {
                const { data } = req.body;

                // Additional data validation
                validateData(data, {
                    name: 'data_content',
                    schema: {
                        type: 'object',
                        required: ['type', 'content'],
                        properties: {
                            type: { type: 'string', minLength: 1 },
                            content: { type: 'object', minProperties: 1 },
                            metadata: { type: 'object' }
                        }
                    }
                });

                // Insert data into database
                const insertQuery = `
                    INSERT INTO test_data (type, content, metadata, created_at)
                    VALUES ($1, $2, $3, NOW())
                    RETURNING id, type, content, metadata, created_at
                `;
                const params = [data.type, data.content, data.metadata || {}];

                const result = await executeQuery(insertQuery, params);
                const createdData = result.rows[0];

                // Notify external systems if needed
                try {
                    // Send REST notification
                    await makeRequest('POST', '/api/external/notify', {
                        event: 'data_created',
                        payload: createdData
                    });

                    // Send GraphQL mutation
                    await executeGraphQLQuery(`
                        mutation NotifyDataCreation($input: DataCreationInput!) {
                            notifyDataCreation(input: $input) {
                                success
                                message
                            }
                        }
                    `, {
                        input: {
                            id: createdData.id,
                            type: createdData.type,
                            timestamp: new Date().toISOString()
                        }
                    });
                } catch (notifyError) {
                    // Log notification error but don't fail the request
                    logMessage('warn', `Failed to notify external systems: ${notifyError.message}`);
                }

                // Send successful response
                logMessage('info', `Successfully created data with id: ${createdData.id}`);
                res.status(201).json({
                    status: 'success',
                    data: createdData
                });
            } catch (error) {
                errorHandler(error, req, res, () => {});
            }
        });
    } catch (error) {
        errorHandler(error, req, res, () => {});
    }
};