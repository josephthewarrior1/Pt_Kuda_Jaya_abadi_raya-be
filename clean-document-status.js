require('dotenv').config();
const admin = require('firebase-admin');
const { db } = require('./config/firebase');

async function cleanData() {
    console.log('Starting cleanup of documentStatus in Firestore...');
    try {
        const carsSnapshot = await db.collectionGroup('cars').get();
        let totalCleaned = 0;

        const batch = db.batch();
        let currentBatchCount = 0;

        for (const carDoc of carsSnapshot.docs) {
            const carData = carDoc.data();
            if (carData.documentStatus !== undefined) {
                batch.update(carDoc.ref, {
                    documentStatus: admin.firestore.FieldValue.delete()
                });
                totalCleaned++;
                currentBatchCount++;

                // Commit if batch limit is reached (usually 500)
                if (currentBatchCount >= 450) {
                    await batch.commit();
                    currentBatchCount = 0;
                }
            }
        }
        
        if (currentBatchCount > 0) {
            await batch.commit();
        }
        
        console.log(`Cleanup complete. Removed documentStatus from ${totalCleaned} cars in Firestore.`);
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanData();
