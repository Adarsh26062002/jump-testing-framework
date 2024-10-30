/**
 * Date and Time Utilities
 * This file provides utilities for handling date and time operations across the application.
 * 
 * Requirements addressed:
 * - Date and Time Management (system_architecture.component_responsibilities)
 */

// External dependencies
// moment v2.29.1 - Date and time manipulation library
import moment from 'moment';

// Internal dependencies
import { createError } from './errors';
import { logMessage } from './logger';
import { validateData } from './validation';

// Global date and time format constants
export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm:ss';
export const DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

// Schema for date validation
const dateSchema = {
    name: 'date',
    schema: {
        type: 'object',
        properties: {
            date: {
                type: ['string', 'object'],
                description: 'Date string or Date object'
            },
            format: {
                type: 'string',
                description: 'Date format string'
            }
        },
        required: ['date']
    }
};

/**
 * Formats a given date object into a string based on the specified format.
 * Implements standardized date formatting across the application.
 * 
 * @param date - The date to format (Date object or valid date string)
 * @param format - The format to use (defaults to DATETIME_FORMAT)
 * @returns Formatted date string
 * @throws ValidationError if date is invalid
 */
export function formatDate(date: Date | string, format: string = DATETIME_FORMAT): string {
    try {
        // Validate input parameters
        validateData({ date, format }, dateSchema);

        // Create moment instance from input date
        const momentDate = moment(date);

        // Validate if the date is valid
        if (!momentDate.isValid()) {
            throw createError(
                'VALIDATION_ERROR',
                `Invalid date provided: ${date}`
            );
        }

        // Format the date
        const formattedDate = momentDate.format(format);

        // Log successful formatting
        logMessage('debug', `Date formatted successfully: ${date} -> ${formattedDate}`);

        return formattedDate;
    } catch (error) {
        // If it's already a standard error, rethrow it
        if (error && typeof error === 'object' && 'type' in error) {
            throw error;
        }

        // Otherwise, create a new error
        const formattingError = createError(
            'VALIDATION_ERROR',
            `Error formatting date: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw formattingError;
    }
}

/**
 * Parses a date string into a date object based on the specified format.
 * Implements standardized date parsing across the application.
 * 
 * @param dateString - The date string to parse
 * @param format - The format to use for parsing (defaults to DATETIME_FORMAT)
 * @returns Parsed Date object
 * @throws ValidationError if date string is invalid or cannot be parsed
 */
export function parseDate(dateString: string, format: string = DATETIME_FORMAT): Date {
    try {
        // Validate input parameters
        validateData({ date: dateString, format }, dateSchema);

        // Parse the date string using moment
        const parsedDate = moment(dateString, format, true);

        // Validate if the parsed date is valid
        if (!parsedDate.isValid()) {
            throw createError(
                'VALIDATION_ERROR',
                `Invalid date string or format. Date: ${dateString}, Format: ${format}`
            );
        }

        // Convert to JavaScript Date object
        const resultDate = parsedDate.toDate();

        // Log successful parsing
        logMessage('debug', `Date parsed successfully: ${dateString} -> ${resultDate.toISOString()}`);

        return resultDate;
    } catch (error) {
        // If it's already a standard error, rethrow it
        if (error && typeof error === 'object' && 'type' in error) {
            throw error;
        }

        // Otherwise, create a new error
        const parsingError = createError(
            'VALIDATION_ERROR',
            `Error parsing date: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw parsingError;
    }
}