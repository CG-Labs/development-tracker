/**
 * Firebase to Cosmos DB Migration Script
 *
 * Migrates all Firestore collections to Azure Cosmos DB
 * Run this after both Firebase and Cosmos DB are accessible
 *
 * Usage:
 *   node scripts/migration/migrate-firestore-to-cosmos.mjs
 *
 * Prerequisites:
 *   - Firebase Admin SDK credentials
 *   - Cosmos DB connection string in .env
 *   - Both databases accessible
 */

import admin from 'firebase-admin';
import { CosmosClient } from '@azure/cosmos';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
config();

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync('./firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

// Initialize Cosmos DB
const cosmosClient = new CosmosClient(
  process.env.COSMOS_DB_CONNECTION_STRING || ''
);
const database = cosmosClient.database('devtracker');

// Collections to migrate
const COLLECTIONS = [
  { name: 'users', partitionKey: 'uid' },
  { name: 'invites', partitionKey: 'email' },
  { name: 'notifications', partitionKey: 'userId' },
  { name: 'auditLogs', partitionKey: 'userId' },
  { name: 'notes', partitionKey: 'unitId' },
  { name: 'developmentCompanies', partitionKey: 'id' },
  { name: 'incentiveSchemes', partitionKey: 'id' },
  { name: 'settings', partitionKey: 'id' },
];

/**
 * Convert Firestore Timestamp to ISO string
 */
function convertTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (obj.constructor.name === 'Timestamp') {
    return obj.toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    converted[key] = convertTimestamps(value);
  }
  return converted;
}

/**
 * Migrate a single collection
 */
async function migrateCollection(collectionName, partitionKey) {
  console.log(`\n📦 Migrating collection: ${collectionName}`);

  try {
    // Read from Firestore
    const snapshot = await firestore.collection(collectionName).get();
    console.log(`   Found ${snapshot.size} documents in Firestore`);

    if (snapshot.empty) {
      console.log(`   ⚠️  Collection is empty, skipping`);
      return { success: 0, failed: 0 };
    }

    // Get Cosmos container
    const container = database.container(collectionName);

    let success = 0;
    let failed = 0;

    // Migrate each document
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();

        // Transform Firestore Timestamps to ISO strings
        const transformed = convertTimestamps(data);

        // Add 'id' field (Cosmos DB requirement)
        transformed.id = doc.id;

        // Ensure partition key exists
        if (!transformed[partitionKey]) {
          console.warn(`   ⚠️  Missing partition key '${partitionKey}' for doc ${doc.id}, using doc ID`);
          transformed[partitionKey] = doc.id;
        }

        // Create in Cosmos DB
        await container.items.create(transformed);
        success++;

        if (success % 10 === 0) {
          console.log(`   Migrated ${success}/${snapshot.size} documents...`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to migrate document ${doc.id}:`, error.message);
        failed++;
      }
    }

    console.log(`   ✅ Migration complete: ${success} success, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error(`   ❌ Failed to migrate collection ${collectionName}:`, error.message);
    return { success: 0, failed: 0 };
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Firebase to Cosmos DB migration\n');
  console.log('Source: Firebase Firestore');
  console.log('Target: Cosmos DB (devtracker database)\n');

  const results = {
    total: 0,
    success: 0,
    failed: 0,
  };

  for (const collection of COLLECTIONS) {
    const result = await migrateCollection(collection.name, collection.partitionKey);
    results.success += result.success;
    results.failed += result.failed;
    results.total += result.success + result.failed;
  }

  console.log('\n📊 Migration Summary');
  console.log('═══════════════════════════════════════');
  console.log(`Total documents processed: ${results.total}`);
  console.log(`✅ Successfully migrated:   ${results.success}`);
  console.log(`❌ Failed to migrate:      ${results.failed}`);
  console.log('═══════════════════════════════════════\n');

  if (results.failed === 0) {
    console.log('✨ All data migrated successfully!');
  } else {
    console.log('⚠️  Some documents failed to migrate. Review errors above.');
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
