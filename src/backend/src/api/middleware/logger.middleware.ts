// External dependencies
// winston v3.3.3
import { Request, Response, NextFunction } from 'express';

// Internal dependencies
import { logMessage } from '../../utils/logger';

/**
 * Logs incoming API requests with detailed information for traceability
 * Implements API logging requirements from system architecture specifications
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const logRequest = (req: Request, res: Response, next: NextFunction): void => {
    // Extract relevant request details
    const {
        method,
        originalUrl,
        headers,
        ip,
        body
    } = req;

    // Format request details for logging
    const requestDetails = {
        method,
        url: originalUrl,
        clientIp: ip,
        userAgent: headers['user-agent'],
        contentType: headers['content-type'],
        // Exclude sensitive headers like authorization
        headers: Object.entries(headers)
            .filter(([key]) => !['authorization', 'cookie'].includes(key.toLowerCase()))
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
        // Only log body for non-file uploads and when content isn't too large
        body: headers['content-type']?.includes('multipart/form-data') ? '[File Upload]' : 
              JSON.stringify(body).length > 1000 ? '[Large Payload]' : body
    };

    // Log the request with info level
    logMessage(
        'info',
        `Incoming ${method} request to ${originalUrl} - ${JSON.stringify(requestDetails)}`
    );

    // Store request timestamp for response time calculation
    res.locals.requestStartTime = Date.now();
    
    next();
};

/**
 * Logs outgoing API responses with timing and status information
 * Implements API response logging requirements from system architecture specifications
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const logResponse = (req: Request, res: Response, next: NextFunction): void => {
    // Store original end method to wrap it
    const originalEnd = res.end;
    const startTime = Date.now();

    // Override end method to intercept response
    res.end = function(chunk?: any, encoding?: string | undefined, callback?: (() => void) | undefined): Response {
        const responseTime = Date.now() - startTime;
        
        // Format response details for logging
        const responseDetails = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            contentType: res.get('Content-Type'),
            contentLength: res.get('Content-Length'),
            // Include response headers excluding sensitive ones
            headers: Object.entries(res.getHeaders())
                .filter(([key]) => !['set-cookie'].includes(key.toLowerCase()))
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
        };

        // Determine log level based on status code
        const logLevel = res.statusCode >= 500 ? 'error' :
                        res.statusCode >= 400 ? 'warn' : 
                        'info';

        // Log the response
        logMessage(
            logLevel,
            `Outgoing response for ${req.method} ${req.originalUrl} - ${JSON.stringify(responseDetails)}`
        );

        // Call original end method
        return originalEnd.call(this, chunk, encoding, callback);
    };

    next();
};