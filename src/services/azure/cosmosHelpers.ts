/**
 * Cosmos DB Helper Functions
 *
 * Common utilities for working with Cosmos DB
 */

import { Container, type FeedOptions } from '@azure/cosmos';

/**
 * Generate a unique ID for Cosmos DB documents
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Execute a query and return all results
 */
export async function queryAll<T>(
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
 * Execute a query with pagination
 */
export async function queryWithPagination<T>(
  container: Container,
  query: string,
  parameters: Array<{ name: string; value: any }> = [],
  maxItemCount: number = 50,
  continuationToken?: string
): Promise<{
  items: T[];
  continuationToken?: string;
  hasMore: boolean;
}> {
  const feedOptions: FeedOptions = {
    maxItemCount,
    continuationToken,
  };

  const queryIterator = container.items.query<T>(
    { query, parameters },
    feedOptions
  );

  const response = await queryIterator.fetchNext();

  return {
    items: response.resources,
    continuationToken: response.continuationToken,
    hasMore: response.hasMoreResults,
  };
}

/**
 * Get item by ID with partition key
 */
export async function getItemById<T = any>(
  container: Container,
  id: string,
  partitionKey: string
): Promise<T | null> {
  try {
    const { resource } = await container.item(id, partitionKey).read();
    return (resource as T) || null;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create or update an item (upsert)
 */
export async function upsertItem<T extends { id: string }>(
  container: Container,
  item: T
): Promise<T> {
  const { resource } = await container.items.upsert<T>(item);
  return resource!;
}

/**
 * Create an item
 */
export async function createItem<T = any>(
  container: Container,
  item: any
): Promise<T> {
  const { resource } = await container.items.create(item);
  return resource as T;
}

/**
 * Update an item (replace)
 */
export async function replaceItem<T = any>(
  container: Container,
  id: string,
  partitionKey: string,
  item: any
): Promise<T> {
  const { resource } = await container.item(id, partitionKey).replace(item);
  return resource as T;
}

/**
 * Patch an item (partial update)
 * Note: Cosmos DB patch operations require specific format
 */
export async function patchItem<T = any>(
  container: Container,
  id: string,
  partitionKey: string,
  operations: Array<{ op: 'add' | 'replace' | 'remove' | 'set' | 'incr'; path: string; value?: any }>
): Promise<T> {
  const { resource } = await container
    .item(id, partitionKey)
    .patch(operations as any);
  return resource as T;
}

/**
 * Delete an item
 */
export async function deleteItem(
  container: Container,
  id: string,
  partitionKey: string
): Promise<void> {
  await container.item(id, partitionKey).delete();
}

/**
 * Check if item exists
 */
export async function itemExists(
  container: Container,
  id: string,
  partitionKey: string
): Promise<boolean> {
  try {
    await container.item(id, partitionKey).read();
    return true;
  } catch (error: any) {
    if (error.code === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Count items matching a query
 */
export async function countItems(
  container: Container,
  query: string,
  parameters: Array<{ name: string; value: any }> = []
): Promise<number> {
  const countQuery = query.replace(/^SELECT\s+\*/i, 'SELECT VALUE COUNT(1)');
  const { resources } = await container.items
    .query<number>({ query: countQuery, parameters })
    .fetchAll();
  return resources[0] || 0;
}
