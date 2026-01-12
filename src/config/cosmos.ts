/**
 * Azure Cosmos DB Configuration
 *
 * Connection and client setup for Cosmos DB NoSQL API
 */

import { CosmosClient, Container, Database } from '@azure/cosmos';

// Cosmos DB configuration from environment
const endpoint = import.meta.env.COSMOS_DB_ENDPOINT || '';
const key = import.meta.env.COSMOS_DB_KEY || '';
const databaseId = 'devtracker';

// Create Cosmos Client
export const cosmosClient = new CosmosClient({ endpoint, key });

// Database reference
export const database: Database = cosmosClient.database(databaseId);

// Container references
export const containers = {
  users: database.container('users'),
  invites: database.container('invites'),
  notifications: database.container('notifications'),
  auditLogs: database.container('auditLogs'),
  notes: database.container('notes'),
  developmentCompanies: database.container('developmentCompanies'),
  incentiveSchemes: database.container('incentiveSchemes'),
  settings: database.container('settings'),
};

/**
 * Get a container by name
 */
export function getContainer(containerName: string): Container {
  return database.container(containerName);
}

/**
 * Helper to execute a query with parameters
 */
export async function executeQuery<T>(
  container: Container,
  query: string,
  parameters: Array<{ name: string; value: any }> = []
): Promise<T[]> {
  const { resources } = await container.items
    .query<T>({ query, parameters })
    .fetchAll();
  return resources;
}

/**
 * Helper to get a single item by ID and partition key
 */
export async function getItem<T>(
  container: Container,
  id: string,
  partitionKey: string
): Promise<T | null> {
  try {
    const { resource } = await container.item(id, partitionKey).read<T>();
    return resource || null;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Helper to create an item
 */
export async function createItem<T = any>(
  container: Container,
  item: any
): Promise<T> {
  const { resource } = await container.items.create(item);
  return resource as T;
}

/**
 * Helper to update an item
 */
export async function updateItem<T = any>(
  container: Container,
  id: string,
  partitionKey: string,
  updates: any
): Promise<T> {
  const { resource } = await container
    .item(id, partitionKey)
    .replace(updates);
  return resource as T;
}

/**
 * Helper to delete an item
 */
export async function deleteItem(
  container: Container,
  id: string,
  partitionKey: string
): Promise<void> {
  await container.item(id, partitionKey).delete();
}

/**
 * Query with pagination support (continuation tokens)
 */
export async function queryWithPagination<T>(
  container: Container,
  query: string,
  parameters: Array<{ name: string; value: any }> = [],
  maxItemCount: number = 50,
  continuationToken?: string
): Promise<{ items: T[]; continuationToken?: string; hasMore: boolean }> {
  const queryIterator = container.items.query<T>(
    { query, parameters },
    { maxItemCount, continuationToken }
  );

  const { resources, hasMoreResults, continuationToken: nextToken } =
    await queryIterator.fetchNext();

  return {
    items: resources,
    continuationToken: nextToken,
    hasMore: hasMoreResults,
  };
}
