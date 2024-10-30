// External dependencies
// express v4.17.1 - Web framework
import { Request, Response, NextFunction } from 'express';

// Internal dependencies
import { exportResults } from '../../core/TestReporter/ResultsExporter';
import { makeRequest } from '../../services/rest/client';
import { logMessage } from '../../utils/logger';
import { createError } from '../../utils/errors';

// Global constants
const METRICS_ENDPOINT = '/api/v1/metrics';

// Types for metrics data
interface MetricsData {
    testExecutions: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
    };
    coverage: {
        lines: number;
        functions: number;
        branches: number;
        statements: number;
    };
    performance: {
        averageResponseTime: number;
        p95ResponseTime: number;
        maxResponseTime: number;
    };
}

/**
 * Handles the retrieval and processing of metrics data
 * Implements metrics retrieval functionality as per system_design.api_design.api_endpoints
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function getMetrics(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Log incoming metrics request
        logMessage('info', `Received metrics request from ${req.ip}`);
        logMessage('debug', `Query parameters: ${JSON.stringify(req.query)}`);

        // Extract query parameters for filtering
        const { 
            startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Default to last 24 hours
            endDate = new Date().toISOString(),
            environment = 'all'
        } = req.query;

        // Fetch execution metrics from external service
        const executionMetrics = await makeRequest<MetricsData['testExecutions']>(
            'GET',
            '/test-executions/metrics',
            {
                params: { startDate, endDate, environment }
            }
        );

        // Fetch coverage metrics from external service
        const coverageMetrics = await makeRequest<MetricsData['coverage']>(
            'GET',
            '/coverage/metrics',
            {
                params: { startDate, endDate, environment }
            }
        );

        // Fetch performance metrics from external service
        const performanceMetrics = await makeRequest<MetricsData['performance']>(
            'GET',
            '/performance/metrics',
            {
                params: { startDate, endDate, environment }
            }
        );

        // Combine all metrics data
        const metricsData: MetricsData = {
            testExecutions: executionMetrics.data,
            coverage: coverageMetrics.data,
            performance: performanceMetrics.data
        };

        // Export metrics data to file system
        await exportResults({
            runId: `metrics-${Date.now()}`,
            startTime: startDate as string,
            endTime: endDate as string,
            environment: environment as string,
            status: 'COMPLETED',
            results: [{
                id: `metrics-${Date.now()}`,
                caseId: 'metrics-export',
                status: 'SUCCESS',
                durationMs: 0,
                metrics: [
                    {
                        metricType: 'test_executions',
                        value: metricsData.testExecutions.total,
                        recordedAt: new Date().toISOString()
                    },
                    {
                        metricType: 'test_coverage',
                        value: metricsData.coverage.lines,
                        recordedAt: new Date().toISOString()
                    },
                    {
                        metricType: 'performance',
                        value: metricsData.performance.averageResponseTime,
                        recordedAt: new Date().toISOString()
                    }
                ]
            }]
        });

        // Log successful metrics retrieval
        logMessage('info', 'Successfully retrieved and processed metrics data');

        // Send response
        res.status(200).json({
            success: true,
            data: metricsData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        // Log error
        logMessage('error', `Error retrieving metrics: ${error.message}`);

        // Create standardized error
        const metricsError = createError(
            'METRICS_ERROR',
            `Failed to retrieve metrics: ${error.message}`
        );

        // Pass error to error handling middleware
        next(metricsError);
    }
}