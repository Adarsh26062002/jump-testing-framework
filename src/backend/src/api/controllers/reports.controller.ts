// External dependencies
// express v4.17.1 - Web framework for handling HTTP requests
import { Request, Response } from 'express';

// Internal dependencies
import { generateHTMLReport } from '../../core/TestReporter/HTMLGenerator';
import { exportResults } from '../../core/TestReporter/ResultsExporter';
import { calculateCoverage } from '../../core/TestReporter/CoverageCalculator';

/**
 * Interface for report generation request body
 */
interface GenerateReportRequest {
    runId: string;
    format?: string;
    includeMetrics?: boolean;
    executionData: {
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
    };
}

/**
 * Interface for report retrieval request parameters
 */
interface GetReportRequest {
    reportId: string;
    format?: string;
}

/**
 * Generates a report based on the provided test execution data
 * Implements the report generation requirement from system_design.api_design.api_endpoints
 * 
 * @param req - Express request object containing report generation parameters
 * @param res - Express response object
 */
export async function generateReport(req: Request, res: Response): Promise<void> {
    try {
        const reportRequest = req.body as GenerateReportRequest;
        
        // Validate request body
        if (!reportRequest.runId || !reportRequest.executionData) {
            res.status(400).json({
                error: 'Invalid request body. Required fields: runId, executionData'
            });
            return;
        }

        // Calculate coverage metrics if requested
        let metrics;
        if (reportRequest.includeMetrics) {
            metrics = await calculateCoverage(
                reportRequest.executionData.testCases.map(testCase => ({
                    id: testCase.id,
                    type: 'rest', // Default to REST for this example
                    response: testCase.steps?.[0]?.response,
                    expectedSchema: {
                        name: testCase.name,
                        schema: {} // Schema would be provided in actual implementation
                    }
                }))
            );
        }

        // Generate HTML report
        const reportPath = await generateHTMLReport({
            runId: reportRequest.runId,
            startTime: reportRequest.executionData.startTime,
            endTime: reportRequest.executionData.endTime,
            summary: reportRequest.executionData.summary,
            testCases: reportRequest.executionData.testCases,
            metrics: metrics ? {
                coverage: {
                    statements: metrics.coveragePercentage,
                    branches: metrics.coveragePercentage,
                    functions: metrics.coveragePercentage,
                    lines: metrics.coveragePercentage
                },
                performance: {
                    avgResponseTime: reportRequest.executionData.summary.duration / reportRequest.executionData.summary.total,
                    maxResponseTime: Math.max(...reportRequest.executionData.testCases.map(tc => tc.duration)),
                    minResponseTime: Math.min(...reportRequest.executionData.testCases.map(tc => tc.duration))
                }
            } : undefined
        });

        // Export results in requested format if specified
        if (reportRequest.format) {
            await exportResults({
                runId: reportRequest.runId,
                startTime: reportRequest.executionData.startTime,
                endTime: reportRequest.executionData.endTime,
                environment: process.env.NODE_ENV || 'development',
                status: reportRequest.executionData.summary.failed > 0 ? 'failed' : 'passed',
                results: reportRequest.executionData.testCases.map(testCase => ({
                    id: testCase.id,
                    caseId: testCase.id,
                    status: testCase.status,
                    durationMs: testCase.duration,
                    error: testCase.error,
                    steps: testCase.steps.map((step, index) => ({
                        status: step.status,
                        request: {}, // Request details would be included in actual implementation
                        response: {}, // Response details would be included in actual implementation
                        sequence: index + 1
                    }))
                }))
            }, reportRequest.format);
        }

        // Send response with report details
        res.status(200).json({
            reportId: reportRequest.runId,
            reportPath,
            format: reportRequest.format || 'html',
            metrics: metrics || undefined
        });

    } catch (error) {
        // Handle errors and send appropriate response
        res.status(500).json({
            error: 'Failed to generate report',
            details: error.message
        });
    }
}

/**
 * Retrieves a previously generated report based on the report ID
 * Implements the report retrieval requirement from system_design.api_design.api_endpoints
 * 
 * @param req - Express request object containing report ID
 * @param res - Express response object
 */
export async function getReport(req: Request, res: Response): Promise<void> {
    try {
        const { reportId, format } = req.params as GetReportRequest;

        // Validate report ID
        if (!reportId) {
            res.status(400).json({
                error: 'Report ID is required'
            });
            return;
        }

        // Construct the report file path based on format
        const reportDirectory = format?.toLowerCase() === 'html' 
            ? '/reports'
            : '/exports/results';
        
        const reportExtension = format?.toLowerCase() || 'html';
        const reportPath = `${reportDirectory}/test-report-${reportId}.${reportExtension}`;

        // Check if report exists
        try {
            const fs = require('fs').promises;
            const reportContent = await fs.readFile(reportPath, 'utf-8');
            
            // Set appropriate content type based on format
            const contentType = format?.toLowerCase() === 'json' 
                ? 'application/json'
                : format?.toLowerCase() === 'csv'
                    ? 'text/csv'
                    : 'text/html';
            
            res.setHeader('Content-Type', contentType);
            res.status(200).send(reportContent);

        } catch (error) {
            res.status(404).json({
                error: 'Report not found',
                details: `No report found with ID: ${reportId}`
            });
        }

    } catch (error) {
        // Handle errors and send appropriate response
        res.status(500).json({
            error: 'Failed to retrieve report',
            details: error.message
        });
    }
}