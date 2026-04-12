require('dotenv').config();
const { db } = require('./config/firebase');

async function migrateCounters() {
    console.log('Starting counters migration...');
    const collectionsToMap = [
        { old: 'car_counters', field: 'carCount' },
        { old: 'customer_counters', field: 'customerCount' },
        { old: 'invoice_counters', field: 'invoiceCount' },
        { old: 'kwitansi_counters', field: 'kwitansiCount' },
        { old: 'payment_counters', field: 'paymentCount' },
        { old: 'renewal_counters', field: 'renewalCount' }
    ];

    try {
        const batch = db.batch();
        const userUpdates = {}; 
        
        for (const mapping of collectionsToMap) {
            const snap = await db.collection(mapping.old).get();
            for (const doc of snap.docs) {
                const userId = doc.id;
                const data = doc.data();
                const count = data.count || 0;
                
                if (!userUpdates[userId]) {
                    userUpdates[userId] = {};
                }
                userUpdates[userId][mapping.field] = count;
            }
        }

        let updatedCount = 0;
        for (const [userId, updates] of Object.entries(userUpdates)) {
            const ref = db.collection('counters').doc(userId);
            batch.set(ref, updates, { merge: true });
            updatedCount++;
        }

        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Migrated counters for ${updatedCount} users into 'counters' collection.`);
        } else {
            console.log('No counters needed migration.');
        }

        // Delete old counters
        for (const mapping of collectionsToMap) {
            const snap = await db.collection(mapping.old).get();
            const delBatch = db.batch();
            snap.docs.forEach(doc => {
                delBatch.delete(doc.ref);
            });
            if (snap.size > 0) {
                await delBatch.commit();
                console.log(`Deleted ${snap.size} old docs from ${mapping.old}.`);
            }
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}
migrateCounters();
