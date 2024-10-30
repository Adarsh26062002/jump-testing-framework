/**
 * Authentication Middleware
 * Implements JWT-based authentication for API requests as per security architecture specifications.
 * 
 * Requirements addressed:
 * - Authentication and Authorization (security_considerations.authentication_and_authorization)
 * - Security Controls (security_considerations.security_controls)
 */

// External dependencies
// jsonwebtoken v8.5.1 - JWT handling
import { verify, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Internal dependencies
import { createError } from '../../utils/errors';
import { validateData } from '../../utils/validation';
import { logMessage } from '../../utils/logger';

// JWT token schema for validation
const jwtSchema = {
    name: 'jwt_token',
    schema: {
        type: 'object',
        required: ['token'],
        properties: {
            token: { type: 'string', minLength: 1 }
        }
    }
};

// Interface for decoded JWT payload
interface DecodedToken {
    userId: string;
    roles: string[];
    environment: string;
    exp: number;
}

// Interface to extend Express Request with user information
declare global {
    namespace Express {
        interface Request {
            user?: DecodedToken;
        }
    }
}

/**
 * Extracts JWT token from request headers
 * Implements token extraction as per security architecture
 * 
 * @param req - Express request object
 * @returns JWT token string or null
 */
function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return null;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Validates JWT token structure
 * Implements token validation as per security controls
 * 
 * @param token - JWT token string
 * @returns boolean indicating if token structure is valid
 */
function validateTokenStructure(token: string): boolean {
    try {
        return validateData({ token }, jwtSchema);
    } catch (error) {
        logMessage('debug', `Token structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
}

/**
 * Authentication middleware for protecting API routes
 * Implements JWT verification and user authentication as per security architecture
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extract token from request headers
        const token = extractToken(req);
        
        if (!token) {
            logMessage('warn', 'Authentication failed: No token provided');
            const error = createError(
                'AUTHENTICATION_ERROR',
                'No authentication token provided'
            );
            res.status(401).json(error);
            return;
        }

        // Validate token structure
        if (!validateTokenStructure(token)) {
            logMessage('warn', 'Authentication failed: Invalid token structure');
            const error = createError(
                'AUTHENTICATION_ERROR',
                'Invalid token format'
            );
            res.status(401).json(error);
            return;
        }

        // Verify JWT token
        const decoded = verify(token, process.env.JWT_SECRET!) as DecodedToken;

        // Attach decoded user information to request
        req.user = decoded;

        // Log successful authentication
        logMessage('info', `User ${decoded.userId} authenticated successfully`);

        // Proceed to next middleware
        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error instanceof TokenExpiredError) {
            logMessage('warn', 'Authentication failed: Token expired');
            const authError = createError(
                'AUTHENTICATION_ERROR',
                'Token has expired'
            );
            res.status(401).json(authError);
            return;
        }

        if (error instanceof JsonWebTokenError) {
            logMessage('warn', `Authentication failed: ${error.message}`);
            const authError = createError(
                'AUTHENTICATION_ERROR',
                'Invalid token'
            );
            res.status(401).json(authError);
            return;
        }

        // Handle unexpected errors
        logMessage('error', `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        const serverError = createError(
            'AUTHENTICATION_ERROR',
            'Authentication failed'
        );
        res.status(500).json(serverError);
    }
};