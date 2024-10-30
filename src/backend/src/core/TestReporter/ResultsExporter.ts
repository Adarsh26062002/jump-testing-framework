// External dependencies
// fs v14.17.0 - File system operations
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';

// Internal dependencies
import { logMessage } from '../../utils/logger';
import { createError } from '../../utils/errors';

// Promisify fs functions for async/await usage
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Supported export formats
const SUPPORTED_FORMATS = ['JSON', 'CSV', 'XML'] as const;
type ExportFormat = typeof SUPPORTED_FORMATS[number];

// Global configuration for exports
const EXPORT_CONFIG = {
    defaultFormat: 'JSON' as ExportFormat,
    outputDirectory: '/exports/results',
    retentionPeriod: 30
};

/**
 * Interface for test results data structure based on database schema
 */
interface TestResultsData {
    runId: string;
    startTime: string;
    endTime: string;
    environment: string;
    status: string;
    results: {
        id: string;
        caseId: string;
        status: string;
        durationMs: number;
        error?: any;
        steps?: {
            status: string;
            request: any;
            response: any;
            sequence: number;
        }[];
        metrics?: {
            metricType: string;
            value: number;
            recordedAt: string;
        }[];
    }[];
}

/**
 * Validates if the provided format is supported
 * 
 * @param format - The export format to validate
 * @returns boolean indicating if the format is supported
 */
function isValidFormat(format: string): format is ExportFormat {
    return SUPPORTED_FORMATS.includes(format as ExportFormat);
}

/**
 * Generates a unique filename for the export
 * 
 * @param format - The export format
 * @returns string representing the unique filename
 */
function generateFilename(format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `test-results-${timestamp}.${format.toLowerCase()}`;
}

/**
 * Converts test results data to the specified format
 * 
 * @param data - The test results data to convert
 * @param format - The target format
 * @returns string representing the formatted data
 */
function formatData(data: TestResultsData, format: ExportFormat): string {
    switch (format) {
        case 'JSON':
            return JSON.stringify(data, null, 2);
        
        case 'CSV':
            // Convert nested data structure to flat CSV format
            const headers = ['runId', 'testId', 'status', 'duration', 'error'];
            const rows = data.results.map(result => [
                data.runId,
                result.caseId,
                result.status,
                result.durationMs,
                result.error ? JSON.stringify(result.error) : ''
            ]);
            return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        
        case 'XML':
            // Convert data to XML format
            const xmlElements = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<testResults>',
                `  <run id="${data.runId}" environment="${data.environment}">`,
                `    <startTime>${data.startTime}</startTime>`,
                `    <endTime>${data.endTime}</endTime>`,
                `    <status>${data.status}</status>`,
                ...data.results.map(result => [
                    '    <result>',
                    `      <id>${result.id}</id>`,
                    `      <caseId>${result.caseId}</caseId>`,
                    `      <status>${result.status}</status>`,
                    `      <duration>${result.durationMs}</duration>`,
                    result.error ? `      <error>${JSON.stringify(result.error)}</error>` : '',
                    '    </result>'
                ].filter(Boolean).join('\n')),
                '  </run>',
                '</testResults>'
            ];
            return xmlElements.join('\n');
        
        default:
            throw createError('VALIDATION_ERROR', `Unsupported format: ${format}`);
    }
}

/**
 * Ensures the export directory exists
 * 
 * @param directory - The directory path to ensure
 */
async function ensureDirectoryExists(directory: string): Promise<void> {
    try {
        await mkdir(directory, { recursive: true });
    } catch (error) {
        throw createError(
            'FLOW_ERROR',
            `Failed to create export directory: ${error.message}`
        );
    }
}

/**
 * Exports test results to the specified format and location
 * Implements test results export functionality as per system architecture specifications
 * 
 * @param resultsData - The test results data to export
 * @param format - The format to export to (defaults to EXPORT_CONFIG.defaultFormat)
 * @returns Promise that resolves when the export is complete
 * @throws Error if export fails or format is invalid
 */
export async function exportResults(
    resultsData: TestResultsData,
    format: string = EXPORT_CONFIG.defaultFormat
): Promise<void> {
    try {
        // Validate format
        if (!isValidFormat(format)) {
            throw createError(
                'VALIDATION_ERROR',
                `Invalid export format. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
            );
        }

        // Log export initiation
        logMessage('info', `Initiating test results export in ${format} format`);

        // Ensure export directory exists
        await ensureDirectoryExists(EXPORT_CONFIG.outputDirectory);

        // Generate unique filename
        const filename = generateFilename(format);
        const filePath = path.join(EXPORT_CONFIG.outputDirectory, filename);

        // Format data according to specified format
        const formattedData = formatData(resultsData, format);

        // Write to file
        await writeFile(filePath, formattedData, 'utf8');

        // Log successful export
        logMessage(
            'info',
            `Successfully exported test results to ${filePath}`
        );

    } catch (error) {
        // Handle and log any errors during export
        const exportError = createError(
            'FLOW_ERROR',
            `Failed to export test results: ${error.message}`
        );
        logMessage('error', `Export error: ${error.message}`);
        throw exportError;
    }
}