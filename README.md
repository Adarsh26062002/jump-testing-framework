# Test Framework Backend

A robust, scalable, and production-ready test automation framework built with TypeScript and Node.js.

## System Architecture

The framework consists of five core components working together to provide comprehensive test automation capabilities:

1. **Test Generator**
   - Generates test cases from GraphQL and REST API schemas
   - Supports flow-based, API-level, and database-level testing
   - Automated test case generation with schema parsing

2. **Test Executor**
   - Handles parallel test execution
   - Implements retry mechanisms
   - Validates responses and database states
   - Manages test flow execution

3. **Test Manager**
   - Schedules and coordinates test execution
   - Tracks execution status
   - Manages system resources
   - Maintains test state

4. **Test Reporter**
   - Generates HTML reports
   - Calculates test coverage
   - Exports results in multiple formats
   - Integrates with CI/CD systems

5. **Data Generator**
   - Generates test data based on schemas
   - Handles database seeding
   - Maintains data referential integrity
   - Validates against defined schemas

## Technology Stack

### Core Technologies
- **TypeScript** (Primary Language)
  - Strong typing for test reliability
  - Native GraphQL/REST support
  - Excellent async/await handling

- **Node.js** (Runtime)
  - Efficient async operations
  - Native PostgreSQL support
  - Extensive package ecosystem

### Key Libraries
- **Testing**: Jest, Mocha, Chai
- **API**: GraphQL Client, Axios
- **Database**: node-postgres, Knex.js
- **Utilities**: Winston, Moment.js

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd test-framework
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp src/backend/.env.example src/backend/.env
```

4. Configure environment variables in `.env`:
```env
# Server Configuration
APP_PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_framework
DB_USER=postgres
DB_PASSWORD=your_password

# API Configuration
API_BASE_URL=http://localhost:4000
API_TIMEOUT=5000
API_CLIENT_ID=test-framework

# Security
JWT_SECRET=your_jwt_secret
ALLOWED_ORIGINS=http://localhost:3000
```

### Running the Application

1. Start the server:
```bash
npm run start
```

2. For development with hot reload:
```bash
npm run dev
```

3. Run tests:
```bash
npm run test
```

## API Integration

### GraphQL Integration
- Configure GraphQL client in `src/config/api.config.ts`
- Default endpoint: `http://localhost:4000/graphql`
- Supports schema introspection
- Handles authentication headers

### REST Integration
- Configure REST client in `src/config/api.config.ts`
- Base URL configurable via environment
- Supports custom headers
- Implements retry mechanisms

## Database Integration

- PostgreSQL for test data and results storage
- Knex.js for query building
- Migrations for schema management
- Connection pooling for optimal performance

## Security Features

- JWT-based authentication
- Role-based access control
- Request validation middleware
- Secure headers configuration
- CORS protection
- Rate limiting

## Development Guidelines

1. **Code Style**
   - Follow TypeScript best practices
   - Use ESLint and Prettier
   - Maintain consistent naming conventions

2. **Testing**
   - Write unit tests for new features
   - Maintain test coverage above 80%
   - Include integration tests

3. **Documentation**
   - Document new APIs
   - Update README for major changes
   - Include JSDoc comments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.