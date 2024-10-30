// Jest Configuration v26.6.3
// This configuration file defines the Jest testing framework setup for the backend application
// Implements requirements from system_architecture.core_testing_components

module.exports = {
  // Specify test environment
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // File extensions to handle
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'clover',
    'html'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Important directories to include/exclude
  roots: [
    '<rootDir>/src'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Setup files to run before/after tests
  setupFilesAfterEnv: [
    '<rootDir>/src/config/test.config.ts'
  ],

  // Global setup configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: true
    }
  },

  // Verbose output for detailed test results
  verbose: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Test timeout
  testTimeout: 30000,

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Error handling configuration
  errorOnDeprecated: true,

  // Clear mocks between tests
  clearMocks: true,
  
  // Automatically restore mock state between every test
  restoreMocks: true,

  // Indicates whether each individual test should be reported during the run
  notify: true,

  // Automatically reset mock state between every test
  resetMocks: true,

  // Automatically restore mock state and implementation between every test
  resetModules: true,

  // Detect open handles (async operations that weren't finished)
  detectOpenHandles: true,

  // Force coverage collection from ignored files
  forceCoverageMatch: [],

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Custom resolver configuration
  resolver: undefined,

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};