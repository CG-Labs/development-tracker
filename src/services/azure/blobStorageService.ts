/**
 * Azure Blob Storage Service
 *
 * Handles file uploads to Azure Blob Storage
 * Replaces Firebase Storage functionality
 */

import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';

// Storage configuration from environment
const connectionString = import.meta.env.STORAGE_CONNECTION_STRING || '';
const containerName = import.meta.env.STORAGE_CONTAINER_NAME || 'company-logos';

let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

/**
 * Initialize Blob Storage client
 */
function initializeBlobClient(): BlobServiceClient {
  if (!blobServiceClient) {
    if (!connectionString) {
      throw new Error('STORAGE_CONNECTION_STRING environment variable is not set');
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

/**
 * Get container client
 */
function getContainerClient(): ContainerClient {
  if (!containerClient) {
    const blobService = initializeBlobClient();
    containerClient = blobService.getContainerClient(containerName);
  }
  return containerClient;
}

/**
 * Upload file to blob storage
 * Returns the public URL of the uploaded blob
 */
export async function uploadBlob(
  file: File,
  blobName: string
): Promise<string> {
  const container = getContainerClient();
  const blockBlobClient: BlockBlobClient = container.getBlockBlobClient(blobName);

  try {
    // Upload file
    await blockBlobClient.uploadData(file, {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    });

    // Return public URL
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error uploading blob:', error);
    throw new Error('Failed to upload file to Azure Blob Storage');
  }
}

/**
 * Delete a blob
 */
export async function deleteBlob(blobName: string): Promise<void> {
  const container = getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);

  try {
    await blockBlobClient.delete();
  } catch (error) {
    console.error('Error deleting blob:', error);
    throw new Error('Failed to delete file from Azure Blob Storage');
  }
}

/**
 * Get blob URL
 */
export function getBlobUrl(blobName: string): string {
  const container = getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  return blockBlobClient.url;
}

/**
 * Check if blob exists
 */
export async function blobExists(blobName: string): Promise<boolean> {
  const container = getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);

  try {
    const exists = await blockBlobClient.exists();
    return exists;
  } catch (error) {
    return false;
  }
}

/**
 * List all blobs in container
 */
export async function listBlobs(): Promise<string[]> {
  const container = getContainerClient();
  const blobNames: string[] = [];

  try {
    for await (const blob of container.listBlobsFlat()) {
      blobNames.push(blob.name);
    }
    return blobNames;
  } catch (error) {
    console.error('Error listing blobs:', error);
    return [];
  }
}
