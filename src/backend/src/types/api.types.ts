/**
 * API Types Definition File
 * Version: 1.0.0
 * 
 * This file contains TypeScript interfaces and types for API interactions,
 * including configurations for GraphQL and REST clients.
 */

/**
 * Interface for configuring GraphQL client settings.
 * Implements the specification from system_design.api_design.graphql_client_configuration
 */
export interface GraphQLClientConfig {
  /** GraphQL endpoint URL */
  endpoint: string;

  /** Request headers for GraphQL operations */
  headers: {
    authorization?: string;
    'content-type': string;
    [key: string]: string | undefined;
  };

  /** Request timeout in milliseconds */
  timeout: number;

  /** Number of retry attempts for failed requests */
  retryAttempts: number;

  /** Flag to enable/disable schema validation */
  validateSchema: boolean;
}

/**
 * Interface for GraphQL API responses with generic data type
 * Implements the specification from system_design.api_design.graphql_client_configuration
 */
export interface GraphQLResponse<T = any> {
  /** Response data of generic type T */
  data?: T;

  /** Array of GraphQL errors if any occurred */
  errors?: Array<{
    /** Error message describing what went wrong */
    message: string;
    /** Path to the field that caused the error */
    path: string[];
    /** Optional additional error details */
    extensions?: Record<string, any>;
  }>;
}

/**
 * Interface for configuring REST client settings
 * Implements the specification from system_design.api_design.rest_client_configuration
 */
export interface RESTClientConfig {
  /** Base URL for REST API endpoints */
  baseUrl: string;

  /** Request headers for REST operations */
  headers: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Configuration for retry behavior */
  retryConfig: {
    /** Number of retry attempts */
    attempts: number;
    /** Backoff time in milliseconds between retries */
    backoff: number;
  };

  /**
   * Function to validate HTTP status codes
   * @param status - HTTP status code
   * @returns boolean indicating if the status is valid
   */
  validateStatus: (status: number) => boolean;
}

/**
 * Interface for REST API responses with generic data type
 * Implements the specification from system_design.api_design.rest_client_configuration
 */
export interface RESTResponse<T = any> {
  /** HTTP status code */
  status: number;

  /** Response data of generic type T */
  data: T;

  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Type guard to check if a response is a GraphQL response
 * @param response - Response object to check
 * @returns boolean indicating if the response is a GraphQL response
 */
export function isGraphQLResponse(response: any): response is GraphQLResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    (('data' in response) || ('errors' in response && Array.isArray(response.errors)))
  );
}

/**
 * Type guard to check if a response is a REST response
 * @param response - Response object to check
 * @returns boolean indicating if the response is a REST response
 */
export function isRESTResponse(response: any): response is RESTResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    'data' in response &&
    'headers' in response
  );
}