require('dotenv').config();
const { db } = require('./config/firebase');

async function fillStartDate() {
    console.log('🔄 Starting Database Update for Car Start Date...');

    try {
        const carDataRef = db.ref('car_data');
        const snapshot = await carDataRef.once('value');
        const usersData = snapshot.val();

        if (!usersData) {
            console.log('⚠️ No car_data found.');
            return;
        }

        let updateCount = 0;

        for (const userId in usersData) {
            const userCars = usersData[userId];
            const updates = {};

            for (const carId in userCars) {
                const car = userCars[carId];

                const carData = car.carData || {};
                const startDate = carData.startDate;
                const dueDate = carData.dueDate;

                if (!startDate || startDate === '') {
                    let calculatedStartDate = '2024-01-01'; // Default fallback

                    if (dueDate) {
                        const due = new Date(dueDate);
                        // Make sure it's a valid date
                        if (!isNaN(due.getTime())) {
                            due.setFullYear(due.getFullYear() - 1);

                            // Check if original dueDate is in YYYY-MM-DD format
                            if (typeof dueDate === 'string' && dueDate.length === 10 && dueDate.includes('-')) {
                                const year = due.getFullYear();
                                const month = String(due.getMonth() + 1).padStart(2, '0');
                                const day = String(due.getDate()).padStart(2, '0');
                                calculatedStartDate = `${year}-${month}-${day}`;
                            } else {
                                // Default to simple format YYYY-MM-DD
                                const year = due.getFullYear();
                                const month = String(due.getMonth() + 1).padStart(2, '0');
                                const day = String(due.getDate()).padStart(2, '0');
                                calculatedStartDate = `${year}-${month}-${day}`;
                            }
                        }
                    }

                    updates[`${carId}/carData/startDate`] = calculatedStartDate;
                    updateCount++;
                }
            }

            if (Object.keys(updates).length > 0) {
                await carDataRef.child(userId).update(updates);
                console.log(`  ✅ Updated ${Object.keys(updates).length} cars for user: ${userId}`);
            }
        }

        console.log(`\n✅ Update done: ${updateCount} cars updated with startDate.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Update Error:', error);
        process.exit(1);
    }
}

fillStartDate();
