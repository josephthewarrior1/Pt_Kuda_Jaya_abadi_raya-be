require('dotenv').config();
const { db } = require('./config/firebase');

async function deleteCollection(collectionPath) {
    const colRef = db.collection(collectionPath);
    const snapshot = await colRef.get();
    
    if (snapshot.size === 0) {
        console.log(`Collection ${collectionPath} is already empty.`);
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted ${snapshot.size} documents from collection ${collectionPath}.`);
}

async function run() {
    console.log('Deleting legacy quotation_counters collection...');
    try {
        await deleteCollection('quotation_counters');
        console.log('Cleanup finished!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
