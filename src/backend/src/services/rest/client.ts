// External dependencies
// axios v0.21.1 - HTTP client library
import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios';

// Internal dependencies
import { RESTClientConfig, RESTResponse } from '../../types/api.types';
import { createError } from '../../utils/errors';
import { logMessage } from '../../utils/logger';

/**
 * Create axios instance with default configuration
 * Implements REST client configuration as per system_design.api_design.rest_client_configuration
 */
const axiosInstance: AxiosInstance = axios.create({
    baseURL: RESTClientConfig.baseUrl,
    headers: RESTClientConfig.headers,
    timeout: RESTClientConfig.timeout
});

/**
 * Makes an HTTP request using the configured axios instance
 * Implements standardized REST client operations with error handling and logging
 * 
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param url - Request URL (will be appended to baseURL)
 * @param data - Request payload (optional)
 * @returns Promise resolving to RESTResponse
 * @throws NetworkError for request failures
 */
export async function makeRequest<T = any>(
    method: Method,
    url: string,
    data?: any
): Promise<RESTResponse<T>> {
    try {
        // Log request details
        logMessage('info', `Making ${method} request to ${url}`);
        logMessage('debug', `Request payload: ${JSON.stringify(data)}`);

        // Prepare request configuration
        const config: AxiosRequestConfig = {
            method,
            url,
            data,
            validateStatus: (status: number) => {
                // Use the validateStatus function from RESTClientConfig if available
                if (RESTClientConfig.validateStatus) {
                    return RESTClientConfig.validateStatus(status);
                }
                // Default validation: consider 2xx and 3xx as success
                return status >= 200 && status < 400;
            }
        };

        // Make the request
        const response = await axiosInstance.request<T>(config);

        // Log successful response
        logMessage('debug', `Response received: ${JSON.stringify({
            status: response.status,
            headers: response.headers,
            data: response.data
        })}`);

        // Return standardized REST response
        return {
            status: response.status,
            data: response.data,
            headers: response.headers as Record<string, string>
        };

    } catch (error) {
        // Log error details
        logMessage('error', `Request failed: ${error.message}`);

        // Handle axios errors
        if (axios.isAxiosError(error)) {
            // Create standardized error based on error type
            if (error.code === 'ECONNABORTED') {
                throw createError('NETWORK_ERROR', `Request timeout after ${RESTClientConfig.timeout}ms: ${error.message}`);
            }
            
            if (error.response) {
                // Server responded with error status
                throw createError('NETWORK_ERROR', `Server responded with status ${error.response.status}: ${error.message}`);
            }
            
            if (error.request) {
                // Request was made but no response received
                throw createError('NETWORK_ERROR', `No response received from server: ${error.message}`);
            }
        }

        // Handle other types of errors
        throw createError('NETWORK_ERROR', `Request failed: ${error.message}`);
    }
}

// Add request interceptor for common headers and auth
axiosInstance.interceptors.request.use(
    (config) => {
        // Log request being sent
        logMessage('debug', `Sending request to ${config.url}`);
        return config;
    },
    (error) => {
        // Log request error
        logMessage('error', `Request interceptor error: ${error.message}`);
        return Promise.reject(error);
    }
);

// Add response interceptor for common error handling
axiosInstance.interceptors.response.use(
    (response) => {
        // Log response received
        logMessage('debug', `Received response from ${response.config.url}`);
        return response;
    },
    (error) => {
        // Log response error
        logMessage('error', `Response interceptor error: ${error.message}`);
        return Promise.reject(error);
    }
);