/**
 * Cosmos DB API Client - Browser Compatible
 * Makes REST calls to backend API instead of direct Cosmos SDK
 */

const API_BASE = '/api/cosmos';

export async function queryAll<T>(containerName: string, query: string, parameters: any[] = []): Promise<T[]> {
  const response = await fetch(`${API_BASE}/${containerName}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, parameters })
  });
  if (!response.ok) throw new Error(`Query failed: ${response.statusText}`);
  return response.json();
}

export async function getItemById<T>(containerName: string, id: string, partitionKey: string): Promise<T | null> {
  const response = await fetch(`${API_BASE}/${containerName}/${id}/${partitionKey}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Get failed: ${response.statusText}`);
  return response.json();
}

export async function createItem<T>(containerName: string, item: any): Promise<T> {
  const response = await fetch(`${API_BASE}/${containerName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!response.ok) throw new Error(`Create failed: ${response.statusText}`);
  return response.json();
}

export async function replaceItem<T>(containerName: string, id: string, partitionKey: string, item: any): Promise<T> {
  const response = await fetch(`${API_BASE}/${containerName}/${id}/${partitionKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!response.ok) throw new Error(`Replace failed: ${response.statusText}`);
  return response.json();
}

export async function deleteItem(containerName: string, id: string, partitionKey: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${containerName}/${id}/${partitionKey}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(`Delete failed: ${response.statusText}`);
}

export async function upsertItem<T>(containerName: string, item: any): Promise<T> {
  const response = await fetch(`${API_BASE}/${containerName}/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!response.ok) throw new Error(`Upsert failed: ${response.statusText}`);
  return response.json();
}
