/**
 * Cosmos DB API Proxy - Browser to Backend
 *
 * Proxies all Cosmos DB operations through backend API
 * Backend has Cosmos SDK, browser makes HTTP calls
 */

const API_BASE = '/api/cosmos';

// Mock container that proxies to backend
const createApiContainer = (containerName: string) => ({
  item: (id: string, partitionKey: string) => ({
    read: async () => {
      const res = await fetch(`${API_BASE}/${containerName}/${id}/${partitionKey}`);
      if (res.status === 404) return { resource: null };
      const resource = await res.json();
      return { resource };
    },
    replace: async (data: any) => {
      const res = await fetch(`${API_BASE}/${containerName}/${id}/${partitionKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resource = await res.json();
      return { resource };
    },
    delete: async () => {
      await fetch(`${API_BASE}/${containerName}/${id}/${partitionKey}`, { method: 'DELETE' });
      return {};
    }
  }),
  items: {
    query: (querySpec: any, options?: any) => ({
      fetchAll: async () => {
        const res = await fetch(`${API_BASE}/${containerName}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: querySpec.query, parameters: querySpec.parameters })
        });
        const resources = await res.json();
        return { resources };
      },
      fetchNext: async () => {
        const res = await fetch(`${API_BASE}/${containerName}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: querySpec.query, parameters: querySpec.parameters, maxItemCount: options?.maxItemCount, continuationToken: options?.continuationToken })
        });
        const data = await res.json();
        return { resources: data.resources || data, hasMoreResults: false, continuationToken: undefined };
      }
    }),
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/${containerName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resource = await res.json();
      return { resource };
    },
    upsert: async (data: any) => {
      const res = await fetch(`${API_BASE}/${containerName}/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resource = await res.json();
      return { resource };
    }
  }
});

export const containers = {
  users: createApiContainer('users'),
  invites: createApiContainer('invites'),
  notifications: createApiContainer('notifications'),
  auditLogs: createApiContainer('auditLogs'),
  notes: createApiContainer('notes'),
  developmentCompanies: createApiContainer('developmentCompanies'),
  incentiveSchemes: createApiContainer('incentiveSchemes'),
  settings: createApiContainer('settings'),
};

export const cosmosClient = {} as any;
export const database = {
  container: (name: string) => createApiContainer(name)
};

export function getContainer(containerName: string): any {
  return createApiContainer(containerName);
}

export async function executeQuery<T>(container: any, query: string, parameters: any[] = []): Promise<T[]> {
  const { resources } = await container.items.query({ query, parameters }).fetchAll();
  return resources;
}

export async function getItem<T = any>(container: any, id: string, partitionKey: string): Promise<T | null> {
  const { resource } = await container.item(id, partitionKey).read();
  return resource;
}

export async function createItem<T = any>(container: any, item: any): Promise<T> {
  const { resource } = await container.items.create(item);
  return resource as T;
}

export async function updateItem<T = any>(container: any, id: string, partitionKey: string, updates: any): Promise<T> {
  const { resource } = await container.item(id, partitionKey).replace(updates);
  return resource as T;
}

export async function deleteItem(container: any, id: string, partitionKey: string): Promise<void> {
  await container.item(id, partitionKey).delete();
}

export async function queryWithPagination<T>(container: any, query: string, parameters: any[] = [], maxItemCount: number = 50, continuationToken?: string): Promise<{ items: T[]; continuationToken?: string; hasMore: boolean }> {
  const { resources, hasMoreResults, continuationToken: nextToken } = await container.items.query({ query, parameters }, { maxItemCount, continuationToken }).fetchNext();
  return { items: resources, continuationToken: nextToken, hasMore: hasMoreResults };
}
