import { api } from '@/lib/api';

export interface SchemasResponse {
  status: string;
  statusCode: number;
  message: string;
  payload: string[];
  count: number;
}

/**
 * Fetch all available schemas from the API
 */
export async function getSchemas(): Promise<string[]> {
  try {
    const response = await api.get<SchemasResponse>('/schemas');
    return response.payload || [];
  } catch (error) {
    console.error('Failed to fetch schemas:', error);
    throw error;
  }
}

/**
 * Get display name for schema (last part of the path)
 */
export function getSchemaDisplayName(schema: string): string {
  const parts = schema.split('/');
  return parts[parts.length - 1] || schema;
}

/**
 * Group schemas by category (second to last part of path)
 */
export function groupSchemasByCategory(schemas: string[]): Record<string, string[]> {
  return schemas.reduce((acc, schema) => {
    const parts = schema.split('/');
    const category = parts[parts.length - 2] || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(schema);
    return acc;
  }, {} as Record<string, string[]>);
}
