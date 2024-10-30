// External dependencies
// winston v3.3.3 - For logging capabilities
import * as winston from 'winston';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as handlebars from 'handlebars'; // handlebars v4.7.7 - For HTML template rendering

// Internal dependencies
import { logMessage } from '../../utils/logger';
import { trackExecutionProgress, finalizeExecution } from '../TestManager/ExecutionTracker';

// Global configuration from JSON specification
const HTML_REPORT_CONFIG = {
    templatePath: '/templates/report.html',
    outputDirectory: '/reports',
    includeMetrics: true
};

/**
 * Interface for test execution data structure
 */
interface TestExecutionData {
    runId: string;
    startTime: string;
    endTime: string;
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
    };
    testCases: Array<{
        id: string;
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        error?: {
            message: string;
            stack?: string;
        };
        steps: Array<{
            name: string;
            status: 'passed' | 'failed' | 'skipped';
            duration: number;
            error?: string;
        }>;
    }>;
    metrics?: {
        coverage?: {
            statements: number;
            branches: number;
            functions: number;
            lines: number;
        };
        performance?: {
            avgResponseTime: number;
            maxResponseTime: number;
            minResponseTime: number;
        };
    };
}

/**
 * Formats duration in milliseconds to a human-readable string
 * @param duration - Duration in milliseconds
 * @returns Formatted duration string
 */
function formatDuration(duration: number): string {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

/**
 * Registers custom Handlebars helpers for report generation
 */
function registerHandlebarsHelpers(): void {
    handlebars.registerHelper('formatDate', (date: string) => {
        return new Date(date).toLocaleString();
    });

    handlebars.registerHelper('formatDuration', (duration: number) => {
        return formatDuration(duration);
    });

    handlebars.registerHelper('percentageFormat', (value: number) => {
        return `${(value * 100).toFixed(2)}%`;
    });

    handlebars.registerHelper('statusColor', (status: string) => {
        const colors = {
            passed: 'success',
            failed: 'danger',
            skipped: 'warning'
        };
        return colors[status] || 'secondary';
    });
}

/**
 * Generates an HTML report from test execution data
 * Implements test reporting requirements from system_architecture.core_testing_components
 * 
 * @param executionData - Test execution data to be included in the report
 * @returns Promise<string> - Path to the generated HTML report
 */
export async function generateHTMLReport(executionData: TestExecutionData): Promise<string> {
    try {
        // Log the start of report generation
        logMessage('info', `Starting HTML report generation for execution ${executionData.runId}`);

        // Track the start of report generation
        trackExecutionProgress(executionData.runId, {
            currentStep: 'HTML_REPORT_GENERATION_STARTED',
            completedSteps: 0,
            totalSteps: 4,
            metrics: {
                duration: 0,
                resourceUsage: {
                    cpu: 0,
                    memory: 0
                }
            }
        });

        // Load the HTML template
        const templatePath = path.join(process.cwd(), HTML_REPORT_CONFIG.templatePath);
        const templateContent = await fs.readFile(templatePath, 'utf-8');

        // Register Handlebars helpers
        registerHandlebarsHelpers();

        // Track template loading progress
        trackExecutionProgress(executionData.runId, {
            currentStep: 'TEMPLATE_LOADED',
            completedSteps: 1,
            totalSteps: 4,
            metrics: {
                duration: Date.now() - new Date(executionData.startTime).getTime(),
                resourceUsage: {
                    cpu: process.cpuUsage().user,
                    memory: process.memoryUsage().heapUsed
                }
            }
        });

        // Compile the template
        const template = handlebars.compile(templateContent);

        // Prepare the data for the template
        const reportData = {
            ...executionData,
            generatedAt: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            summary: {
                ...executionData.summary,
                passRate: executionData.summary.passed / executionData.summary.total,
                formattedDuration: formatDuration(executionData.summary.duration)
            }
        };

        // Track data preparation progress
        trackExecutionProgress(executionData.runId, {
            currentStep: 'DATA_PREPARED',
            completedSteps: 2,
            totalSteps: 4,
            metrics: {
                duration: Date.now() - new Date(executionData.startTime).getTime(),
                resourceUsage: {
                    cpu: process.cpuUsage().user,
                    memory: process.memoryUsage().heapUsed
                }
            }
        });

        // Generate the HTML content
        const htmlContent = template(reportData);

        // Create the output directory if it doesn't exist
        const outputDir = path.join(process.cwd(), HTML_REPORT_CONFIG.outputDirectory);
        await fs.mkdir(outputDir, { recursive: true });

        // Generate a unique filename for the report
        const filename = `test-report-${executionData.runId}-${Date.now()}.html`;
        const outputPath = path.join(outputDir, filename);

        // Write the HTML report to file
        await fs.writeFile(outputPath, htmlContent, 'utf-8');

        // Track report generation completion
        trackExecutionProgress(executionData.runId, {
            currentStep: 'REPORT_GENERATED',
            completedSteps: 4,
            totalSteps: 4,
            metrics: {
                duration: Date.now() - new Date(executionData.startTime).getTime(),
                resourceUsage: {
                    cpu: process.cpuUsage().user,
                    memory: process.memoryUsage().heapUsed
                }
            }
        });

        // Finalize the execution tracking
        await finalizeExecution(executionData.runId);

        // Log successful report generation
        logMessage('info', `HTML report generated successfully at ${outputPath}`);

        return outputPath;
    } catch (error) {
        // Log error and rethrow
        logMessage('error', `Failed to generate HTML report: ${error.message}`);
        throw error;
    }
}