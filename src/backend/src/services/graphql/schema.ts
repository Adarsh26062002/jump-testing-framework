// External dependencies
// graphql v15.5.0
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLScalarType
} from 'graphql';

// Internal dependencies
import { executeGraphQLQuery } from './client';

// Custom scalar types
const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format.',
  serialize: (value: any) => value,
  parseValue: (value: any) => new Date(value),
  parseLiteral: (ast: any) => ast.value ? new Date(ast.value) : null
});

const JSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'The `JSON` scalar type represents JSON values as specified by ECMA-404',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast: any) => ast.value
});

// Enums
const AccountStatusEnum = new GraphQLEnumType({
  name: 'AccountStatusEnum',
  values: {
    ACTIVE: { value: 'ACTIVE' },
    PENDING: { value: 'PENDING' }
  }
});

const CURRENCY_CODE = new GraphQLEnumType({
  name: 'CURRENCY_CODE',
  values: {
    USD: { value: 'USD' },
    EUR: { value: 'EUR' },
    CAD: { value: 'CAD' }
  }
});

const ORDER_STATUS = new GraphQLEnumType({
  name: 'ORDER_STATUS',
  values: {
    CONFIRMED: { value: 'CONFIRMED' },
    CANCELLED: { value: 'CANCELLED' },
    FAILED_CHECKOUT: { value: 'FAILED_CHECKOUT' }
  }
});

// Common Types
const Location = new GraphQLObjectType({
  name: 'Location',
  fields: {
    lat: { type: new GraphQLNonNull(GraphQLFloat) },
    lon: { type: new GraphQLNonNull(GraphQLFloat) }
  }
});

const Address = new GraphQLObjectType({
  name: 'Address',
  fields: {
    street1: { type: new GraphQLNonNull(GraphQLString) },
    street2: { type: GraphQLString },
    city: { type: new GraphQLNonNull(GraphQLString) },
    state: { type: new GraphQLNonNull(GraphQLString) },
    zip: { type: new GraphQLNonNull(GraphQLString) },
    country: { type: new GraphQLNonNull(GraphQLString) },
    location: { type: new GraphQLNonNull(Location) }
  }
});

const Account = new GraphQLObjectType({
  name: 'Account',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    status: { type: AccountStatusEnum },
    roles: { type: new GraphQLList(GraphQLString) },
    createdAt: { type: DateTime }
  }
});

// Query Type
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    getAccount: {
      type: Account,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (_, args) => {
        const response = await executeGraphQLQuery(`
          query GetAccount($id: ID!) {
            getAccount(id: $id) {
              id
              email
              firstName
              lastName
              status
              roles
              createdAt
            }
          }
        `, { id: args.id });
        return response.data?.getAccount;
      }
    },
    // Additional queries as per appendices.a.8_jump_graphql_schema
    // ... other query fields
  }
});

// Mutation Type
const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createAccount: {
      type: Account,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString }
      },
      resolve: async (_, args) => {
        const response = await executeGraphQLQuery(`
          mutation CreateAccount($email: String!, $firstName: String, $lastName: String) {
            createAccount(email: $email, firstName: $firstName, lastName: $lastName) {
              id
              email
              firstName
              lastName
              status
              roles
              createdAt
            }
          }
        `, args);
        return response.data?.createAccount;
      }
    },
    // Additional mutations as per appendices.a.8_jump_graphql_schema
    // ... other mutation fields
  }
});

// Define and export the GraphQL schema
export const GRAPHQL_SCHEMA = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
  types: [
    DateTime,
    JSON,
    AccountStatusEnum,
    CURRENCY_CODE,
    ORDER_STATUS,
    Location,
    Address,
    Account
    // Additional types as per appendices.a.8_jump_graphql_schema
  ]
});

/**
 * Helper function to define the GraphQL schema
 * Implements the defineSchema function from the specification
 */
function defineSchema(): GraphQLSchema {
  return GRAPHQL_SCHEMA;
}

// Export the schema definition function
export { defineSchema };