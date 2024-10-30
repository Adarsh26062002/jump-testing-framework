# Use official Node.js 18 Alpine image as base
# Version: 18-alpine
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    # Required for node-gyp and native module compilation
    python3 \
    make \
    g++ \
    # Clean up cache to reduce image size
    && rm -rf /var/cache/apk/*

# Copy package files for dependency installation
# Only copy what's needed for npm install to leverage Docker layer caching
COPY src/backend/package.json ./
COPY src/backend/tsconfig.json ./

# Install production dependencies only
# Using --production flag and ci for deterministic installs
# Using --no-optional to skip optional dependencies
# Using --no-audit to skip vulnerability check during build (should be done separately)
RUN npm ci --production --no-optional --no-audit \
    # Clean npm cache to reduce image size
    && npm cache clean --force

# Copy application source code
# Note: .dockerignore should exclude node_modules, dist, and other non-source files
COPY src/backend/src ./src

# Build TypeScript application
RUN npm run build \
    # Remove source files and devDependencies after build
    && rm -rf src \
    # Remove unnecessary npm files
    && rm -rf ~/.npm

# Expose the application port
# Note: The actual port binding happens at runtime via docker run -p or docker-compose
EXPOSE 3000

# Set user to non-root for security
# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check to verify application status
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]

# Build-time metadata
LABEL maintainer="Test Framework Team" \
    version="1.0.0" \
    description="Test Framework Backend Application" \
    org.opencontainers.image.source="https://github.com/organization/test-framework"