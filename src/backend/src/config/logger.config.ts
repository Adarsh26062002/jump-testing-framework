// External dependencies
// winston v3.3.3 - Logging library for creating and managing log messages
import * as winston from 'winston';

// Internal dependencies
import { logMessage } from '../utils/logger';

/**
 * Interface defining the structure of logger configuration options
 * Implements logging configuration requirements from system architecture
 */
interface LoggerConfig {
    level: string;
    format?: string;
    transports?: {
        console?: boolean;
        file?: {
            enabled: boolean;
            filename?: string;
            maxSize?: number;
            maxFiles?: number;
        };
    };
    metadata?: {
        service?: string;
        environment?: string;
    };
}

/**
 * Default logger configuration values
 * Based on system architecture component configuration standards
 */
const DEFAULT_CONFIG: LoggerConfig = {
    level: 'info',
    format: 'json',
    transports: {
        console: true,
        file: {
            enabled: false,
            filename: 'logs/app.log',
            maxSize: 5242880, // 5MB
            maxFiles: 5
        }
    },
    metadata: {
        service: 'test-framework',
        environment: process.env.NODE_ENV || 'development'
    }
};

/**
 * Global logger configuration instance
 * Implements the logging configuration as specified in system architecture
 */
export const LOGGER_CONFIG = winston.createLogger({
    level: DEFAULT_CONFIG.level,
    format: winston.format.json(),
    transports: [new winston.transports.Console()]
});

/**
 * Configures the winston logger with specified settings
 * Implements the logging configuration requirements from system architecture
 * 
 * @param config - Configuration object for logger settings
 */
export function configureLogger(config: Partial<LoggerConfig> = {}): void {
    try {
        // Merge provided config with defaults
        const finalConfig: LoggerConfig = {
            ...DEFAULT_CONFIG,
            ...config,
            transports: {
                ...DEFAULT_CONFIG.transports,
                ...config.transports
            },
            metadata: {
                ...DEFAULT_CONFIG.metadata,
                ...config.metadata
            }
        };

        // Configure log format
        const logFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.errors({ stack: true }),
            finalConfig.format === 'json' 
                ? winston.format.json()
                : winston.format.simple()
        );

        // Initialize transports array
        const transports: winston.transport[] = [];

        // Configure console transport
        if (finalConfig.transports?.console) {
            transports.push(
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            );
        }

        // Configure file transport
        if (finalConfig.transports?.file?.enabled) {
            transports.push(
                new winston.transports.File({
                    filename: finalConfig.transports.file.filename,
                    maxsize: finalConfig.transports.file.maxSize,
                    maxFiles: finalConfig.transports.file.maxFiles,
                    format: logFormat
                })
            );
        }

        // Create new logger configuration
        const newLoggerConfig = winston.createLogger({
            level: finalConfig.level,
            format: logFormat,
            defaultMeta: finalConfig.metadata,
            transports,
            exitOnError: false
        });

        // Update global logger configuration
        Object.assign(LOGGER_CONFIG, newLoggerConfig);

        // Log successful configuration
        logMessage('info', 'Logger configuration updated successfully');
    } catch (error) {
        // Log configuration error
        logMessage('error', `Failed to configure logger: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}

// Add error event handler to prevent crashes from logger configuration errors
LOGGER_CONFIG.on('error', (error) => {
    console.error('Logger configuration error:', error);
    logMessage('error', `Logger configuration error: ${error.message}`);
});