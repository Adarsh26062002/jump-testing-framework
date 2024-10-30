// ESLint configuration for backend application
// eslint version: 7.14.0

module.exports = {
  // Specify environment settings for Node.js, ES6, and Jest testing
  env: {
    node: true,
    es6: true,
    jest: true,
  },

  // Configure parser options for modern JavaScript features
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },

  // Extend recommended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended', // TypeScript-specific rules
    'plugin:jest/recommended', // Jest-specific rules
    'prettier', // Disable ESLint rules that might conflict with Prettier
  ],

  // Use TypeScript parser
  parser: '@typescript-eslint/parser',

  // Enable necessary plugins
  plugins: [
    '@typescript-eslint',
    'jest',
    'prettier',
  ],

  // Define global variables
  globals: {
    NODE_ENV: 'development',
  },

  // Specify linting rules
  rules: {
    // Enforce semicolons
    'semi': ['error', 'always'],

    // Enforce double quotes
    'quotes': ['error', 'double'],

    // Enforce 2-space indentation
    'indent': ['error', 2],

    // Warn on console statements (for production code)
    'no-console': 'warn',

    // Warn on unused variables
    'no-unused-vars': 'warn',

    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
    }],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        'selector': 'interface',
        'format': ['PascalCase'],
        'prefix': ['I']
      },
      {
        'selector': 'typeAlias',
        'format': ['PascalCase']
      },
      {
        'selector': 'enum',
        'format': ['PascalCase']
      }
    ],

    // Async/Promise rules
    'no-async-promise-executor': 'error',
    'no-return-await': 'error',
    'require-await': 'error',

    // Import rules
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      'devDependencies': ['**/*.test.ts', '**/*.spec.ts', 'jest.config.js']
    }],

    // Jest-specific rules
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/valid-expect': 'error',

    // Best practices
    'no-var': 'error',
    'prefer-const': 'error',
    'no-multiple-empty-lines': ['error', { 'max': 1 }],
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'comma-dangle': ['error', {
      'arrays': 'always-multiline',
      'objects': 'always-multiline',
      'imports': 'always-multiline',
      'exports': 'always-multiline',
      'functions': 'never'
    }]
  },

  // Override rules for specific file patterns
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // Disable JavaScript-specific rules that TypeScript handles
        'no-undef': 'off',
        'no-unused-vars': 'off',
      }
    },
    {
      files: ['*.test.ts', '*.spec.ts'],
      rules: {
        // Relax certain rules for test files
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      }
    }
  ],

  // Settings for import resolution
  settings: {
    'import/resolver': {
      typescript: {},
      node: {
        extensions: ['.js', '.ts']
      }
    }
  }
};