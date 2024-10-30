// External dependencies
// winston v3.3.3 - For logging capabilities
import * as winston from 'winston';

// Internal dependencies
import { calculateCoverage } from './CoverageCalculator';
import { generateHTMLReport } from './HTMLGenerator';
import { exportResults } from './ResultsExporter';
import { logMessage } from '../../utils/logger';

// Types
interface TestExecutionData {
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
 * Orchestrates the reporting of test results by generating HTML reports,
 * calculating coverage metrics, and exporting results.
 * Implements Test Reporting and Export requirement from system_architecture.core_testing_components
 * 
 * @param executionData - Array of test execution data to process
 * @returns Promise<void> that resolves when all reporting tasks are complete
 */
export async function reportTestResults(executionData: TestExecutionData[]): Promise<void> {
    try {
        // Log the start of reporting process
        logMessage('info', 'Starting test results reporting process');

        // Step 1: Calculate coverage metrics
        logMessage('info', 'Calculating test coverage metrics');
        const coverageMetrics = await calculateCoverage(executionData.map(data => ({
            id: data.runId,
            type: data.results[0]?.steps?.[0]?.request?.type || 'rest',
            response: data.results[0]?.steps?.[0]?.response,
            expectedSchema: {
                name: data.results[0]?.caseId,
                schema: data.results[0]?.steps?.[0]?.request?.schema
            }
        })));

        // Step 2: Generate HTML report for each execution
        logMessage('info', 'Generating HTML reports');
        const reportPromises = executionData.map(async (data) => {
            const reportData = {
                runId: data.runId,
                startTime: data.startTime,
                endTime: data.endTime,
                summary: {
                    total: data.results.length,
                    passed: data.results.filter(r => r.status === 'passed').length,
                    failed: data.results.filter(r => r.status === 'failed').length,
                    skipped: data.results.filter(r => r.status === 'skipped').length,
                    duration: data.results.reduce((sum, r) => sum + r.durationMs, 0)
                },
                testCases: data.results.map(result => ({
                    id: result.id,
                    name: result.caseId,
                    status: result.status,
                    duration: result.durationMs,
                    error: result.error,
                    steps: result.steps?.map(step => ({
                        name: `Step ${step.sequence}`,
                        status: step.status,
                        duration: 0, // Duration at step level if available
                        error: step.status === 'failed' ? JSON.stringify(step.response) : undefined
                    })) || []
                })),
                metrics: {
                    coverage: {
                        statements: coverageMetrics.coveragePercentage / 100,
                        branches: coverageMetrics.coveragePercentage / 100,
                        functions: coverageMetrics.coveragePercentage / 100,
                        lines: coverageMetrics.coveragePercentage / 100
                    },
                    performance: {
                        avgResponseTime: data.results.reduce((sum, r) => sum + r.durationMs, 0) / data.results.length,
                        maxResponseTime: Math.max(...data.results.map(r => r.durationMs)),
                        minResponseTime: Math.min(...data.results.map(r => r.durationMs))
                    }
                }
            });

            return generateHTMLReport(reportData);
        });

        // Wait for all HTML reports to be generated
        const reportPaths = await Promise.all(reportPromises);
        logMessage('info', `Generated ${reportPaths.length} HTML reports`);

        // Step 3: Export results in different formats
        logMessage('info', 'Exporting test results');
        const exportPromises = executionData.map(async (data) => {
            // Export in JSON format (default)
            await exportResults(data);
            // Export in CSV format
            await exportResults(data, 'CSV');
            // Export in XML format
            await exportResults(data, 'XML');
        });

        // Wait for all exports to complete
        await Promise.all(exportPromises);
        logMessage('info', `Exported results for ${executionData.length} test executions`);

        // Log successful completion
        logMessage('info', 'Test results reporting process completed successfully');

    } catch (error) {
        // Log error and rethrow
        logMessage('error', `Failed to report test results: ${error.message}`);
        throw error;
    }
}