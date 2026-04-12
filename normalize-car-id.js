require('dotenv').config();
const { db } = require('./config/firebase');

async function run() {
    console.log('Normalizing Car IDs...');
    const oldToNewMap = {};

    try {
        const carsSnap = await db.collectionGroup('cars').get();
        for (const doc of carsSnap.docs) {
            const id = doc.id;
            const match = id.match(/^(.*)-(car|CAR)-(\d+)$/);
            if (match) {
                const prefix = match[1];
                const type = match[2];
                const num = match[3];

                if (type === 'CAR' && num.length === 4) {
                    continue; 
                }

                const newId = `${prefix}-CAR-${num.padStart(4, '0')}`;
                
                if (id !== newId) {
                    console.log(`Renaming: ${id} -> ${newId}`);
                    oldToNewMap[id] = newId;

                    const data = doc.data();
                    data.id = newId;

                    await doc.ref.parent.doc(newId).set(data);
                    await doc.ref.delete();
                }
            }
        }

        const renamedCount = Object.keys(oldToNewMap).length;
        console.log(`Renamed ${renamedCount} cars in database.`);

        if (renamedCount > 0) {
            console.log('Checking for references in other collections to update them...');
            const collectionsToCheck = ['invoices', 'quotations', 'payments', 'kwitansi'];

            for (const colName of collectionsToCheck) {
                const snap = await db.collectionGroup(colName).get();
                let updatedCount = 0;
                
                for (const doc of snap.docs) {
                    const data = doc.data();
                    let needsUpdate = false;
                    const updates = {};

                    if (data.carId && oldToNewMap[data.carId]) {
                        updates.carId = oldToNewMap[data.carId];
                        needsUpdate = true;
                    }
                    
                    if (data.car && data.car.id && oldToNewMap[data.car.id]) {
                        updates['car.id'] = oldToNewMap[data.car.id];
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        await doc.ref.update(updates);
                        updatedCount++;
                    }
                }
                console.log(`Updated ${updatedCount} documents in collection: ${colName}`);
            }
        }

        console.log('Normalization complete!');
        process.exit(0);
    } catch (e) {
        console.error('Error normalizing:', e);
        process.exit(1);
    }
}

run();
