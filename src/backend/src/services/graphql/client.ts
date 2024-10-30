// External dependencies
// axios v0.21.1 - HTTP client for making requests
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Internal dependencies
import { GraphQLClientConfig, GraphQLResponse } from '../../types/api.types';
import { createError } from '../../utils/errors';
import { logMessage } from '../../utils/logger';

/**
 * GraphQL client class responsible for executing queries and mutations
 * Implements requirements from system_design.api_design.graphql_client_configuration
 */
class GraphQLClient {
    private axiosInstance: AxiosInstance;
    private config: GraphQLClientConfig;

    constructor(config: GraphQLClientConfig) {
        this.config = config;
        
        // Initialize axios instance with base configuration
        this.axiosInstance = axios.create({
            baseURL: config.endpoint,
            headers: {
                ...config.headers,
                'Content-Type': 'application/json'
            },
            timeout: config.timeout
        });

        // Add response interceptor for error handling
        this.axiosInstance.interceptors.response.use(
            response => response,
            error => {
                if (error.response) {
                    // Server responded with error status
                    return Promise.reject(createError(
                        'NETWORK_ERROR',
                        `GraphQL request failed with status ${error.response.status}: ${error.response.statusText}`
                    ));
                } else if (error.request) {
                    // Request made but no response received
                    return Promise.reject(createError(
                        'NETWORK_ERROR',
                        `No response received from GraphQL endpoint: ${error.message}`
                    ));
                } else {
                    // Error in request configuration
                    return Promise.reject(createError(
                        'NETWORK_ERROR',
                        `GraphQL request configuration error: ${error.message}`
                    ));
                }
            }
        );
    }

    /**
     * Validates GraphQL response structure
     * @param response - Response to validate
     * @throws {Error} If response structure is invalid
     */
    private validateResponse(response: any): void {
        if (!response || typeof response !== 'object') {
            throw createError(
                'VALIDATION_ERROR',
                'Invalid GraphQL response structure: Response must be an object'
            );
        }

        if (!('data' in response) && !('errors' in response)) {
            throw createError(
                'VALIDATION_ERROR',
                'Invalid GraphQL response structure: Response must contain either data or errors'
            );
        }

        if (response.errors && !Array.isArray(response.errors)) {
            throw createError(
                'VALIDATION_ERROR',
                'Invalid GraphQL response structure: Errors must be an array'
            );
        }
    }

    /**
     * Executes a GraphQL query or mutation
     * Implements the executeGraphQLQuery function from the specification
     * 
     * @param query - GraphQL query or mutation string
     * @param variables - Variables for the query
     * @returns Promise resolving to GraphQL response
     */
    public async executeGraphQLQuery<T = any>(
        query: string,
        variables?: Record<string, any>
    ): Promise<GraphQLResponse<T>> {
        try {
            // Log query execution start
            logMessage('info', `Executing GraphQL query: ${query.slice(0, 100)}...`);

            // Prepare request payload
            const payload = {
                query,
                variables
            };

            // Configure request
            const requestConfig: AxiosRequestConfig = {
                method: 'POST',
                data: payload
            };

            // Execute request
            const response = await this.axiosInstance.request(requestConfig);

            // Validate response structure
            this.validateResponse(response.data);

            // Log successful response
            logMessage('info', `GraphQL query executed successfully`);

            // Return typed response
            return response.data as GraphQLResponse<T>;

        } catch (error) {
            // Log error
            logMessage('error', `GraphQL query execution failed: ${error.message}`);

            // If error is already standardized, rethrow
            if (error.type) {
                throw error;
            }

            // Otherwise create and throw standardized error
            throw createError(
                'NETWORK_ERROR',
                `GraphQL query execution failed: ${error.message}`
            );
        }
    }
}

// Create singleton instance with default configuration
export const GRAPHQL_CLIENT = new GraphQLClient({
    endpoint: process.env.GRAPHQL_ENDPOINT || '',
    headers: {
        'content-type': 'application/json',
        authorization: process.env.GRAPHQL_AUTH_TOKEN || ''
    },
    timeout: parseInt(process.env.GRAPHQL_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.GRAPHQL_RETRY_ATTEMPTS || '3'),
    validateSchema: process.env.GRAPHQL_VALIDATE_SCHEMA === 'true'
});

// Export the executeGraphQLQuery function from the singleton instance
export const executeGraphQLQuery = GRAPHQL_CLIENT.executeGraphQLQuery.bind(GRAPHQL_CLIENT);