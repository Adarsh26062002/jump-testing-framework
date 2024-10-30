// External dependencies
// axios v0.21.1
import axios from 'axios';

// Internal dependencies
import { executeGraphQLQuery } from '../../services/graphql/client';
import { makeRequest } from '../../services/rest/client';
import { logMessage } from '../../utils/logger';
import { createError } from '../../utils/errors';

// Types for parsed schema results
interface ParsedGraphQLType {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    isRequired: boolean;
    isList: boolean;
  }>;
}

interface ParsedGraphQLSchema {
  types: ParsedGraphQLType[];
  queries: Array<{
    name: string;
    parameters: Array<{
      name: string;
      type: string;
      isRequired: boolean;
    }>;
    returnType: string;
  }>;
  mutations: Array<{
    name: string;
    parameters: Array<{
      name: string;
      type: string;
      isRequired: boolean;
    }>;
    returnType: string;
  }>;
}

interface ParsedRESTEndpoint {
  path: string;
  method: string;
  parameters: Array<{
    name: string;
    type: string;
    location: 'path' | 'query' | 'body' | 'header';
    isRequired: boolean;
  }>;
  responses: Array<{
    statusCode: number;
    schema: Record<string, any>;
  }>;
}

interface ParsedRESTSchema {
  endpoints: ParsedRESTEndpoint[];
  definitions: Record<string, any>;
  securitySchemes: Record<string, any>;
}

/**
 * Parses a GraphQL schema to extract relevant information for test generation
 * Implements the schema parsing requirement from system_architecture.component_responsibilities
 * 
 * @param schema - GraphQL schema string or endpoint URL
 * @returns Parsed schema details for test generation
 */
export async function parseGraphQLSchema(schema: string): Promise<ParsedGraphQLSchema> {
  try {
    logMessage('info', 'Starting GraphQL schema parsing');

    // Determine if input is a URL or schema string
    const isUrl = schema.startsWith('http://') || schema.startsWith('https://');
    let schemaData: string;

    if (isUrl) {
      // Execute introspection query to fetch schema
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
              fields {
                name
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
            queryType {
              fields {
                name
                args {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
            mutationType {
              fields {
                name
                args {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      `;

      const response = await executeGraphQLQuery(introspectionQuery);
      if (!response.data) {
        throw createError('SCHEMA_ERROR', 'Failed to fetch GraphQL schema through introspection');
      }
      schemaData = JSON.stringify(response.data.__schema);
    } else {
      schemaData = schema;
    }

    // Parse the schema data
    const parsedSchema: ParsedGraphQLSchema = {
      types: [],
      queries: [],
      mutations: []
    };

    // Parse schema string into JSON if needed
    const schemaJson = typeof schemaData === 'string' ? JSON.parse(schemaData) : schemaData;

    // Extract types
    parsedSchema.types = schemaJson.types
      .filter((type: any) => !type.name.startsWith('__'))
      .map((type: any) => ({
        name: type.name,
        fields: (type.fields || []).map((field: any) => ({
          name: field.name,
          type: getTypeName(field.type),
          isRequired: isNonNullType(field.type),
          isList: isListType(field.type)
        }))
      }));

    // Extract queries
    if (schemaJson.queryType) {
      parsedSchema.queries = schemaJson.queryType.fields.map((query: any) => ({
        name: query.name,
        parameters: query.args.map((arg: any) => ({
          name: arg.name,
          type: getTypeName(arg.type),
          isRequired: isNonNullType(arg.type)
        })),
        returnType: getTypeName(query.type)
      }));
    }

    // Extract mutations
    if (schemaJson.mutationType) {
      parsedSchema.mutations = schemaJson.mutationType.fields.map((mutation: any) => ({
        name: mutation.name,
        parameters: mutation.args.map((arg: any) => ({
          name: arg.name,
          type: getTypeName(arg.type),
          isRequired: isNonNullType(arg.type)
        })),
        returnType: getTypeName(mutation.type)
      }));
    }

    logMessage('info', 'GraphQL schema parsing completed successfully');
    return parsedSchema;

  } catch (error) {
    logMessage('error', `GraphQL schema parsing failed: ${error.message}`);
    throw createError('SCHEMA_ERROR', `Failed to parse GraphQL schema: ${error.message}`);
  }
}

/**
 * Parses a REST schema (OpenAPI/Swagger) to extract relevant information for test generation
 * Implements the schema parsing requirement from system_architecture.component_responsibilities
 * 
 * @param schema - REST API schema string or endpoint URL
 * @returns Parsed schema details for test generation
 */
export async function parseRESTSchema(schema: string): Promise<ParsedRESTSchema> {
  try {
    logMessage('info', 'Starting REST schema parsing');

    // Determine if input is a URL or schema string
    const isUrl = schema.startsWith('http://') || schema.startsWith('https://');
    let schemaData: string;

    if (isUrl) {
      // Fetch schema from URL
      const response = await makeRequest('GET', schema);
      schemaData = JSON.stringify(response.data);
    } else {
      schemaData = schema;
    }

    // Parse the schema data
    const parsedSchema: ParsedRESTSchema = {
      endpoints: [],
      definitions: {},
      securitySchemes: {}
    };

    // Parse schema string into JSON if needed
    const schemaJson = typeof schemaData === 'string' ? JSON.parse(schemaData) : schemaData;

    // Extract endpoints
    for (const path in schemaJson.paths) {
      const pathItem = schemaJson.paths[path];
      
      for (const method in pathItem) {
        const operation = pathItem[method];
        
        const endpoint: ParsedRESTEndpoint = {
          path,
          method: method.toUpperCase(),
          parameters: [],
          responses: []
        };

        // Parse parameters
        const parameters = [
          ...(pathItem.parameters || []),
          ...(operation.parameters || [])
        ];

        endpoint.parameters = parameters.map(param => ({
          name: param.name,
          type: param.schema ? getSchemaType(param.schema) : param.type,
          location: param.in as 'path' | 'query' | 'body' | 'header',
          isRequired: param.required || false
        }));

        // Parse responses
        for (const statusCode in operation.responses) {
          const response = operation.responses[statusCode];
          endpoint.responses.push({
            statusCode: parseInt(statusCode),
            schema: response.schema || {}
          });
        }

        parsedSchema.endpoints.push(endpoint);
      }
    }

    // Extract definitions/components
    parsedSchema.definitions = schemaJson.definitions || schemaJson.components?.schemas || {};
    
    // Extract security schemes
    parsedSchema.securitySchemes = 
      schemaJson.securityDefinitions || 
      schemaJson.components?.securitySchemes || 
      {};

    logMessage('info', 'REST schema parsing completed successfully');
    return parsedSchema;

  } catch (error) {
    logMessage('error', `REST schema parsing failed: ${error.message}`);
    throw createError('SCHEMA_ERROR', `Failed to parse REST schema: ${error.message}`);
  }
}

// Helper functions for type processing
function getTypeName(type: any): string {
  if (!type) return 'any';
  
  if (type.ofType) {
    return getTypeName(type.ofType);
  }
  
  return type.name || 'any';
}

function isNonNullType(type: any): boolean {
  return type.kind === 'NON_NULL' || 
         (type.ofType && type.ofType.kind === 'NON_NULL');
}

function isListType(type: any): boolean {
  return type.kind === 'LIST' || 
         (type.ofType && type.ofType.kind === 'LIST');
}

function getSchemaType(schema: any): string {
  if (schema.$ref) {
    return schema.$ref.split('/').pop();
  }
  
  if (schema.type === 'array') {
    return `${getSchemaType(schema.items)}[]`;
  }
  
  return schema.type || 'any';
}