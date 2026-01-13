import express from 'express';
import cors from 'cors';
import { CosmosClient } from '@azure/cosmos';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Cosmos DB client - now properly server-side
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY
});

const database = cosmosClient.database('devtracker');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User endpoints
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { resource } = await database.container('users').item(req.params.uid, req.params.uid).read();
    res.json(resource);
  } catch (error) {
    if (error.code === 404) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Static files (React app)
app.use(express.static('../dist'));
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: '../dist' });
});

app.listen(port, () => {
  console.log(`DevTracker API listening on port ${port}`);
});
