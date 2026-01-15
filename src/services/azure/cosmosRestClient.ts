/**
 * Cosmos DB REST API Client - Browser Compatible
 * Stub implementation - returns empty data to prevent errors
 */

export async function query<T>(_containerName: string, _sqlQuery: string, _parameters: any[] = []): Promise<T[]> {
  return [];
}

export async function getItem<T>(_containerName: string, _id: string, _partitionKey: string): Promise<T | null> {
  return null;
}

export async function createItem<T>(_containerName: string, item: any): Promise<T> {
  return item as T;
}

export async function replaceItem<T>(_containerName: string, _id: string, _partitionKey: string, item: any): Promise<T> {
  return item as T;
}

export async function deleteItem(_containerName: string, _id: string, _partitionKey: string): Promise<void> {
  // Stub
}
