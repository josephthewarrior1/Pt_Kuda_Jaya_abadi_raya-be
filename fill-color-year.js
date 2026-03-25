require('dotenv').config();
const { db } = require('./config/firebase');

async function updateCars() {
    console.log('🔄 Starting Database Update for Color and Year...');

    try {
        const carDataRef = db.ref('car_data');
        const snapshot = await carDataRef.once('value');
        const usersData = snapshot.val();

        if (!usersData) {
            console.log('⚠️ No car_data found.');
            return;
        }

        let updateCount = 0;
        let colorToggle = true;

        for (const userId in usersData) {
            const userCars = usersData[userId];
            const updates = {};

            for (const carId in userCars) {
                const car = userCars[carId];
                let changed = false;

                const color = car.carData?.color;
                const year = car.carData?.year;

                if (!color || color === '') {
                    updates[`${carId}/carData/color`] = colorToggle ? 'Putih' : 'Hitam';
                    colorToggle = !colorToggle;
                    changed = true;
                }

                if (!year || year === '') {
                    updates[`${carId}/carData/year`] = colorToggle ? '2020' : '2022'; // Randomize slightly
                    changed = true;
                }

                if (changed) {
                    updateCount++;
                }
            }

            if (Object.keys(updates).length > 0) {
                await carDataRef.child(userId).update(updates);
                console.log(`  ✅ Updated ${Object.keys(updates).length / 2} cars for user: ${userId}`);
            }
        }

        console.log(`\n✅ Update done: ${updateCount} cars updated.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Update Error:', error);
        process.exit(1);
    }
}

updateCars();
