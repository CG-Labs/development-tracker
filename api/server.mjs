import express from 'express';
import cors from 'cors';
import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Cosmos DB
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT || process.env.APPSETTING_COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY || process.env.COSMOS_DB_CONNECTION_STRING?.match(/AccountKey=(.*?);?$/)?.[1];

const cosmosClient = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
const database = cosmosClient.database('devtracker');

// Proxy all Cosmos DB operations
const containers = ['users', 'invites', 'notifications', 'auditLogs', 'notes', 'developmentCompanies', 'incentiveSchemes', 'settings'];

// Query endpoint
app.post('/api/cosmos/:container/query', async (req, res) => {
  try {
    const { query, parameters } = req.body;
    const { resources } = await database.container(req.params.container).items.query({ query, parameters }).fetchAll();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get by ID
app.get('/api/cosmos/:container/:id/:pk', async (req, res) => {
  try {
    const { resource } = await database.container(req.params.container).item(req.params.id, req.params.pk).read();
    res.json(resource);
  } catch (error) {
    if (error.code === 404) res.status(404).json(null);
    else res.status(500).json({ error: error.message });
  }
});

// Create
app.post('/api/cosmos/:container', async (req, res) => {
  try {
    const { resource } = await database.container(req.params.container).items.create(req.body);
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Replace
app.put('/api/cosmos/:container/:id/:pk', async (req, res) => {
  try {
    const { resource } = await database.container(req.params.container).item(req.params.id, req.params.pk).replace(req.body);
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete
app.delete('/api/cosmos/:container/:id/:pk', async (req, res) => {
  try {
    await database.container(req.params.container).item(req.params.id, req.params.pk).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert
app.post('/api/cosmos/:container/upsert', async (req, res) => {
  try {
    const { resource } = await database.container(req.params.container).items.upsert(req.body);
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React static files
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`DevTracker API running on port ${port}`);
  console.log(`Cosmos DB: ${cosmosEndpoint}`);
});
