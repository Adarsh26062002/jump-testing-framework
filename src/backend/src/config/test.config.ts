/**
 * Test Configuration Module
 * Version: 1.0.0
 * 
 * This module provides configuration settings for testing environments,
 * implementing the specifications from system_architecture.core_testing_components
 * and system_architecture.component_configuration
 */

// External dependencies
// dotenv v8.2.0 - Load environment variables
import * as dotenv from 'dotenv';

// Internal dependencies
import { configureRESTClient } from './api.config';
import { loadDatabaseConfig } from './database.config';
import { configureLogger } from './logger.config';
import { validateData } from '../utils/validation';
import { logMessage } from '../utils/logger';

// Load environment variables at module initialization
dotenv.config();

/**
 * Interface defining test environment configuration structure
 * Based on system_architecture.component_configuration specifications
 */
interface TestConfig {
  // Test orchestration settings
  orchestrator: {
    maxConcurrency: number;
    timeoutSeconds: number;
  };
  
  // Flow engine settings
  flowEngine: {
    retryAttempts: number;
    waitTimeMs: number;
  };
  
  // API client settings
  api: {
    baseUrl: string;
    timeout: number;
    maxRetries: number;
    headers: Record<string, string>;
  };
  
  // Database settings
  database: {
    poolSize: number;
    idleTimeout: number;
  };
  
  // Logging settings
  logging: {
    level: string;
    format: string;
  };
}

/**
 * Default test configuration values aligned with
 * system_architecture.component_configuration specifications
 */
const DEFAULT_TEST_CONFIG: TestConfig = {
  orchestrator: {
    maxConcurrency: 10,
    timeoutSeconds: 300
  },
  flowEngine: {
    retryAttempts: 3,
    waitTimeMs: 1000
  },
  api: {
    baseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:3000',
    timeout: 5000,
    maxRetries: 3,
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Environment': 'true'
    }
  },
  database: {
    poolSize: 10,
    idleTimeout: 10000
  },
  logging: {
    level: 'info',
    format: 'json'
  }
};

/**
 * Schema for validating test configuration
 * Implements validation requirements from system architecture
 */
const TEST_CONFIG_SCHEMA = {
  name: 'TestConfig',
  schema: {
    type: 'object',
    required: ['orchestrator', 'flowEngine', 'api', 'database', 'logging'],
    properties: {
      orchestrator: {
        type: 'object',
        required: ['maxConcurrency', 'timeoutSeconds'],
        properties: {
          maxConcurrency: { type: 'number', minimum: 1 },
          timeoutSeconds: { type: 'number', minimum: 1 }
        }
      },
      flowEngine: {
        type: 'object',
        required: ['retryAttempts', 'waitTimeMs'],
        properties: {
          retryAttempts: { type: 'number', minimum: 0 },
          waitTimeMs: { type: 'number', minimum: 0 }
        }
      },
      api: {
        type: 'object',
        required: ['baseUrl', 'timeout', 'maxRetries', 'headers'],
        properties: {
          baseUrl: { type: 'string', format: 'uri' },
          timeout: { type: 'number', minimum: 0 },
          maxRetries: { type: 'number', minimum: 0 },
          headers: { type: 'object' }
        }
      },
      database: {
        type: 'object',
        required: ['poolSize', 'idleTimeout'],
        properties: {
          poolSize: { type: 'number', minimum: 1 },
          idleTimeout: { type: 'number', minimum: 0 }
        }
      },
      logging: {
        type: 'object',
        required: ['level', 'format'],
        properties: {
          level: { type: 'string', enum: ['error', 'warn', 'info', 'debug'] },
          format: { type: 'string', enum: ['json', 'simple'] }
        }
      }
    }
  }
};

/**
 * Configures the test environment with specified settings
 * Implements test configuration requirements from system_architecture.core_testing_components
 * 
 * @param config - Configuration object for test environment
 * @throws Error if configuration validation fails
 */
export function configureTestEnvironment(config: Partial<TestConfig> = {}): void {
  try {
    // Log configuration start
    logMessage('info', 'Initializing test environment configuration');

    // Merge provided config with defaults
    const finalConfig: TestConfig = {
      ...DEFAULT_TEST_CONFIG,
      ...config,
      orchestrator: {
        ...DEFAULT_TEST_CONFIG.orchestrator,
        ...config.orchestrator
      },
      flowEngine: {
        ...DEFAULT_TEST_CONFIG.flowEngine,
        ...config.flowEngine
      },
      api: {
        ...DEFAULT_TEST_CONFIG.api,
        ...config.api,
        headers: {
          ...DEFAULT_TEST_CONFIG.api.headers,
          ...config?.api?.headers
        }
      },
      database: {
        ...DEFAULT_TEST_CONFIG.database,
        ...config.database
      },
      logging: {
        ...DEFAULT_TEST_CONFIG.logging,
        ...config.logging
      }
    };

    // Validate the final configuration
    validateData(finalConfig, TEST_CONFIG_SCHEMA);

    // Configure REST client
    configureRESTClient({
      baseUrl: finalConfig.api.baseUrl,
      timeout: finalConfig.api.timeout,
      headers: finalConfig.api.headers,
      validateStatus: (status: number) => status < 500
    });

    // Configure database
    const dbConfig = loadDatabaseConfig();
    Object.assign(dbConfig, {
      max: finalConfig.database.poolSize,
      idleTimeoutMillis: finalConfig.database.idleTimeout
    });

    // Configure logger
    configureLogger({
      level: finalConfig.logging.level,
      format: finalConfig.logging.format,
      transports: {
        console: true,
        file: {
          enabled: true,
          filename: 'logs/test.log',
          maxSize: 5242880, // 5MB
          maxFiles: 5
        }
      },
      metadata: {
        service: 'test-framework',
        environment: 'test'
      }
    });

    // Set global test environment variable
    process.env.NODE_ENV = 'test';

    // Log successful configuration
    logMessage('info', 'Test environment configuration completed successfully');
  } catch (error) {
    // Log configuration failure
    logMessage('error', `Failed to configure test environment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}