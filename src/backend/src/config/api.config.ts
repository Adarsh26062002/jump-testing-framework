/**
 * API Configuration Module
 * Version: 1.0.0
 * 
 * This module configures API client settings for REST client operations,
 * implementing the specifications from system_design.api_design.rest_client_configuration
 */

// External dependencies
// axios v0.21.1 - HTTP client library
import axios from 'axios';

// Internal dependencies
import { RESTClientConfig } from '../types/api.types';
import { logMessage } from '../utils/logger';

/**
 * Default timeout value for API requests in milliseconds
 * Defined in globals as API_TIMEOUT
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Default headers applied to all REST client requests
 */
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Client-Version': '1.0.0'
};

/**
 * Default status validator function for REST client responses
 * Considers any status code less than 500 as valid to allow handling of 4xx errors
 * 
 * @param status - HTTP status code
 * @returns boolean indicating if the status code is considered valid
 */
const defaultStatusValidator = (status: number): boolean => status < 500;

/**
 * Validates the REST client configuration object
 * Ensures all required fields are present and have valid values
 * 
 * @param config - REST client configuration object
 * @throws Error if configuration is invalid
 */
function validateConfig(config: RESTClientConfig): void {
  // Validate baseUrl
  if (!config.baseUrl || typeof config.baseUrl !== 'string') {
    throw new Error('Invalid baseUrl in REST client configuration');
  }

  // Validate headers
  if (!config.headers || typeof config.headers !== 'object') {
    throw new Error('Invalid headers in REST client configuration');
  }

  // Validate timeout
  if (typeof config.timeout !== 'number' || config.timeout <= 0) {
    throw new Error('Invalid timeout in REST client configuration');
  }
}

/**
 * Configures the REST client with specified settings
 * Implements the REST client configuration requirements from the technical specification
 * 
 * @param config - Configuration object for REST client
 */
export function configureRESTClient(config: RESTClientConfig): void {
  try {
    // Log the configuration process initiation
    logMessage('info', 'Initializing REST client configuration');

    // Validate the provided configuration
    validateConfig(config);

    // Configure axios defaults
    axios.defaults.baseURL = config.baseUrl;
    axios.defaults.timeout = config.timeout || DEFAULT_TIMEOUT;
    axios.defaults.headers.common = {
      ...DEFAULT_HEADERS,
      ...config.headers
    };

    // Configure response validation
    axios.defaults.validateStatus = config.validateStatus || defaultStatusValidator;

    // Configure request interceptor for logging
    axios.interceptors.request.use(
      (requestConfig) => {
        logMessage('debug', `Outgoing ${requestConfig.method?.toUpperCase()} request to: ${requestConfig.url}`);
        return requestConfig;
      },
      (error) => {
        logMessage('error', `Request configuration error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // Configure response interceptor for logging
    axios.interceptors.response.use(
      (response) => {
        logMessage('debug', `Received response from: ${response.config.url} with status: ${response.status}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logMessage('error', `API error response: ${error.response.status} - ${error.message}`);
        } else if (error.request) {
          logMessage('error', `No response received: ${error.message}`);
        } else {
          logMessage('error', `Request configuration error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );

    // Log successful configuration
    logMessage('info', 'REST client configuration completed successfully');
  } catch (error) {
    // Log configuration failure
    logMessage('error', `Failed to configure REST client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}