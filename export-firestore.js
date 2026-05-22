const fs = require('fs');
const path = require('path');
const { db } = require('./config/firebase');

function serialize(value) {
  if (value === null || value === undefined) return value;

  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value && typeof value.path === 'string' && value.constructor && value.constructor.name === 'DocumentReference') {
    return value.path;
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serialize(nestedValue)])
    );
  }

  return value;
}

async function exportCollection(collectionRef) {
  const docRefs = await collectionRef.listDocuments();
  const docs = {};

  for (const docRef of docRefs) {
    const doc = await docRef.get();
    const subcollections = await docRef.listCollections();
    const data = {
      id: docRef.id,
      exists: doc.exists,
      data: doc.exists ? serialize(doc.data()) : null,
    };

    if (subcollections.length) {
      data.subcollections = {};

      for (const subcollection of subcollections) {
        data.subcollections[subcollection.id] = await exportCollection(subcollection);
      }
    }

    docs[docRef.id] = data;
  }

  return docs;
}

async function main() {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const collections = await db.listCollections();
  const result = {
    exportedAt: new Date().toISOString(),
    projectId: 'pt-kuda-jaya-abadi',
    collections: {},
  };

  for (const collection of collections) {
    console.log(`Exporting ${collection.id}...`);
    result.collections[collection.id] = await exportCollection(collection);
  }

  const outputPath = path.join(__dirname, `firestore-export-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Firestore export saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error('Firestore export failed:', error);
  process.exitCode = 1;
});
