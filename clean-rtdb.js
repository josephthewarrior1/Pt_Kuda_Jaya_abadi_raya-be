require('dotenv').config();
const { admin } = require('./config/firebase');

async function cleanData() {
    console.log('Starting RTDB cleanup...');
    try {
        const db = admin.database();
        const carDataRef = db.ref('car_data');
        const snap = await carDataRef.once('value');
        const data = snap.val();
        if (!data) {
            console.log('No data found.');
            process.exit(0);
        }

        let updates = {};
        let count = 0;

        for (const userId in data) {
            const userCars = data[userId];
            for (const carId in userCars) {
                if (userCars[carId].documentStatus !== undefined) {
                    // Update field to null in Firebase RTDB deletes it
                    updates[`${userId}/${carId}/documentStatus`] = null;
                    count++;
                }
            }
        }

        if (count > 0) {
            await carDataRef.update(updates);
            console.log(`Cleaned documentStatus from ${count} cars in RTDB.`);
        } else {
            console.log('No documentStatus needed to be cleaned in RTDB.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
cleanData();
